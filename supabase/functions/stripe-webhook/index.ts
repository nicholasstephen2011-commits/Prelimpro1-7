// Stripe webhook handler for Supabase Edge Functions (Deno)
// - Verifies signature
// - Routes key billing events
// - Provides idempotent logging hook (optional Supabase table)
// Env required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Optional for logging: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'https://esm.sh/stripe@12.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.4';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Map Stripe price IDs to internal tiers (keep in sync with constants/billing.ts)
const PRICE_TO_TIER: Record<string, 'basic' | 'pro' | 'business' | 'corporate' | 'unknown'> = {
  price_basic_monthly: 'basic',
  price_basic_annual: 'basic',
  price_pro_monthly: 'pro',
  price_pro_annual: 'pro',
  price_business_monthly: 'business',
  price_business_annual: 'business',
};

interface SubscriptionSnapshot {
  subscriptionId: string;
  customerId: string;
  tier: string;
  priceId: string;
  seats: number;
  status: string;
  currentPeriodEnd: number;
  cancelAt?: number | null;
  cancelAtPeriodEnd?: boolean;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'charge.refunded':
      case 'charge.dispute.created':
        await handleChargeEvent(event.data.object as Stripe.Charge, event.type);
        break;
      default:
        // Unhandled event types are acknowledged to keep Stripe happy
        break;
    }
  } catch (err) {
    await logEvent(event, 'error', err instanceof Error ? err.message : 'Unknown error');
    return new Response('Processing error', { status: 500 });
  }

  await logEvent(event, 'processed');
  return new Response('ok', { status: 200 });
});

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;
  if (!subscriptionId || !customerId) return;
  // TODO: link the Stripe customer/subscription to your org/user via metadata
  // Example: session.metadata.orgId, session.metadata.userId
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const primaryItem = subscription.items.data[0];
  const priceId = primaryItem?.price?.id || 'unknown';
  const tier = PRICE_TO_TIER[priceId] || 'unknown';
  const seats = primaryItem?.quantity || 1;
  const snapshot: SubscriptionSnapshot = {
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    tier,
    priceId,
    seats,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAt: subscription.cancel_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  await persistSubscription(snapshot);
  await upsertEntitlements(snapshot);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const snapshot: SubscriptionSnapshot = {
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    tier: 'unknown',
    priceId: subscription.items.data[0]?.price?.id || 'unknown',
    seats: subscription.items.data[0]?.quantity || 1,
    status: 'canceled',
    currentPeriodEnd: subscription.current_period_end,
    cancelAt: subscription.canceled_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
  await persistSubscription(snapshot);
  // TODO: enforce downgrades/locks here if desired
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // TODO: clear dunning flags, store invoice URL and amount for org
  await persistInvoice(invoice, 'paid');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // TODO: start dunning (emails/banners) and set grace windows based on invoice.next_payment_attempt
  await persistInvoice(invoice, 'failed');
}

async function handleChargeEvent(charge: Stripe.Charge, eventType: string) {
  // TODO: record refunds/disputes; optionally restrict premium access
  await persistCharge(charge, eventType);
}

async function persistSubscription(snapshot: SubscriptionSnapshot) {
  if (!supabase) return;
  try {
    await supabase.from('org_subscriptions').upsert({
      subscription_id: snapshot.subscriptionId,
      customer_id: snapshot.customerId,
      tier: snapshot.tier,
      price_id: snapshot.priceId,
      seats: snapshot.seats,
      status: snapshot.status,
      current_period_end: snapshot.currentPeriodEnd,
      cancel_at: snapshot.cancelAt,
      cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subscription_id' });
  } catch {
    // Swallow to keep webhook fast; rely on Stripe retries
  }
}

async function upsertEntitlements(snapshot: SubscriptionSnapshot) {
  if (!supabase) return;
  // Example: map customer/org linkage to set feature flags and seat caps.
  // Requires you to know which org maps to this Stripe customer.
  try {
    await supabase.from('org_entitlements').upsert({
      customer_id: snapshot.customerId,
      tier: snapshot.tier,
      seat_limit: snapshot.seats,
      status: snapshot.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_id' });
  } catch {
    // Ignore; Stripe will retry
  }
}

async function persistInvoice(invoice: Stripe.Invoice, status: 'paid' | 'failed') {
  if (!supabase) return;
  try {
    await supabase.from('billing_invoices').upsert({
      invoice_id: invoice.id,
      customer_id: invoice.customer as string,
      subscription_id: invoice.subscription as string,
      status,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      hosted_invoice_url: invoice.hosted_invoice_url,
      next_payment_attempt: invoice.next_payment_attempt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'invoice_id' });
  } catch {
    // Ignore; Stripe will retry
  }
}

async function persistCharge(charge: Stripe.Charge, eventType: string) {
  if (!supabase) return;
  try {
    await supabase.from('billing_charges').upsert({
      charge_id: charge.id,
      customer_id: charge.customer as string,
      invoice_id: charge.invoice as string,
      amount_refunded: charge.amount_refunded,
      status: charge.status,
      event_type: eventType,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'charge_id' });
  } catch {
    // Ignore; Stripe will retry
  }
}

async function logEvent(event: Stripe.Event, status: 'processed' | 'error', message?: string) {
  if (!supabase) return;
  try {
    await supabase.from('billing_events').upsert({
      id: event.id,
      type: event.type,
      status,
      message,
      created_at: new Date().toISOString(),
      payload: event,
    }, { onConflict: 'id' });
  } catch {
    // Logging is best-effort
  }
}
