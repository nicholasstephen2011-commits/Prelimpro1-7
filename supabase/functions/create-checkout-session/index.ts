// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session with validated price IDs and metadata
// Env required: STRIPE_SECRET_KEY, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL
// Optional price ID overrides (set to your live/test price IDs):
//   PRICE_BASIC_MONTHLY_ID, PRICE_BASIC_ANNUAL_ID,
//   PRICE_PRO_MONTHLY_ID, PRICE_PRO_ANNUAL_ID,
//   PRICE_BUSINESS_MONTHLY_ID, PRICE_BUSINESS_ANNUAL_ID

import Stripe from 'https://esm.sh/stripe@12.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const successUrlDefault = Deno.env.get('STRIPE_SUCCESS_URL') || 'https://premiumlien.com/success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlDefault = Deno.env.get('STRIPE_CANCEL_URL') || 'https://premiumlien.com/cancel';

if (!stripeSecretKey) {
  console.error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Map friendly price aliases (used in the app) to real Stripe price IDs set via env
const priceMap: Record<string, string> = {
  price_basic_monthly: Deno.env.get('PRICE_BASIC_MONTHLY_ID') || 'price_basic_monthly',
  price_basic_annual: Deno.env.get('PRICE_BASIC_ANNUAL_ID') || 'price_basic_annual',
  price_pro_monthly: Deno.env.get('PRICE_PRO_MONTHLY_ID') || 'price_pro_monthly',
  price_pro_annual: Deno.env.get('PRICE_PRO_ANNUAL_ID') || 'price_pro_annual',
  price_business_monthly: Deno.env.get('PRICE_BUSINESS_MONTHLY_ID') || 'price_business_monthly',
  price_business_annual: Deno.env.get('PRICE_BUSINESS_ANNUAL_ID') || 'price_business_annual',
  price_per_notice_standard: Deno.env.get('PRICE_PER_NOTICE_STANDARD_ID') || 'price_per_notice_standard',
  price_per_notice_certified: Deno.env.get('PRICE_PER_NOTICE_CERTIFIED_ID') || 'price_per_notice_certified',
  price_per_notice_priority: Deno.env.get('PRICE_PER_NOTICE_PRIORITY_ID') || 'price_per_notice_priority',
  price_per_notice_certified_oh: Deno.env.get('PRICE_PER_NOTICE_CERTIFIED_OH_ID') || 'price_per_notice_certified_oh',
  price_per_notice_priority_oh: Deno.env.get('PRICE_PER_NOTICE_PRIORITY_OH_ID') || 'price_per_notice_priority_oh',
  price_per_notice_priority_certified: Deno.env.get('PRICE_PER_NOTICE_PRIORITY_CERTIFIED_ID') || 'price_per_notice_priority_certified',
  price_per_notice_priority_certified_oh:
    Deno.env.get('PRICE_PER_NOTICE_PRIORITY_CERTIFIED_OH_ID') || 'price_per_notice_priority_certified_oh',
};

interface RequestBody {
  priceId?: string; // legacy: uses predefined Stripe price IDs
  price?: number; // legacy dollars input
  amountCents?: number; // preferred: explicit amount in cents
  customerEmail?: string;
  metadata?: Record<string, string>;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { priceId, price, amountCents, customerEmail, metadata = {}, quantity = 1, successUrl, cancelUrl } = body;
  if (!priceId && (amountCents == null || Number.isNaN(amountCents)) && (price == null || Number.isNaN(price))) {
    return json({ error: 'priceId or price/amountCents is required' }, 400);
  }

  // Resolve to real Stripe price ID if provided
  let resolvedPrice: string | null = null;
  if (priceId) {
    resolvedPrice = priceMap[priceId] || priceId;
    const allowed = new Set(Object.values(priceMap));
    if (!allowed.has(resolvedPrice)) {
      return json({ error: 'Unsupported priceId' }, 400);
    }
  }

  const success = successUrl || successUrlDefault;
  const cancel = cancelUrl || cancelUrlDefault;

  try {
    const cents = amountCents != null && !Number.isNaN(amountCents) ? Math.round(amountCents) : null;
    const isAmountFlow = !resolvedPrice && (cents != null || price != null);
    const perNotice = isAmountFlow || (priceId?.startsWith('price_per_notice') ?? false);
    const lineItem = isAmountFlow
      ? {
          price_data: {
            currency: 'usd',
            unit_amount: cents != null ? cents : Math.round((price as number) * 100),
            product_data: { name: metadata?.type || 'Notice delivery' },
          },
          quantity: quantity < 1 ? 1 : quantity,
        }
      : {
          price: resolvedPrice as string,
          quantity: quantity < 1 ? 1 : quantity,
        };

    const session = await stripe.checkout.sessions.create({
      mode: perNotice ? 'payment' : 'subscription',
      success_url: success,
      cancel_url: cancel,
      customer_email: customerEmail,
      line_items: [lineItem],
      allow_promotion_codes: true,
      metadata,
      subscription_data: perNotice ? undefined : { metadata },
      payment_intent_data: perNotice ? { metadata } : undefined,
    });

    return json({ url: session.url, sessionId: session.id }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating session';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
