// Lightweight example of an HTTP webhook handler.
// In production, verify signatures using `stripe.webhooks.constructEvent` and your signing secret.

import { handleStripeEvent } from '../lib/stripe';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2022-11-15' });

export async function stripeWebhookHandler(req: any, res: any) {
  try {
    // If a webhook signing secret is provided, verify signature using raw body
    const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    if (signingSecret) {
      const sig = req.headers && (req.headers['stripe-signature'] || req.headers['Stripe-Signature']);
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      // `req.rawBody` is expected when using frameworks that expose the raw payload.
      const raw = req.rawBody || req.body && JSON.stringify(req.body);
      try {
        event = stripe.webhooks.constructEvent(raw, sig as string, signingSecret);
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }
    } else {
      // No signing secret configured — fall back to parsed body (use only for local/testing)
      event = req.body;
    }

    const result = await handleStripeEvent(event);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
}

export default stripeWebhookHandler;
