// Minimal Stripe webhook event handler used by tests.
// This file intentionally keeps business logic separate from HTTP/webhook signature verification
// so it can be unit-tested without needing Stripe signing secrets.

export async function handleStripeEvent(event: any) {
  const type = event?.type || 'unknown';
  switch (type) {
    case 'payment_intent.succeeded':
      // TODO: implement real handling (update order status, notify user)
      return { handled: 'payment_intent.succeeded', id: event.data?.object?.id };

    case 'invoice.payment_failed':
      // TODO: implement retry / notify logic
      return { handled: 'invoice.payment_failed', id: event.data?.object?.id };

    default:
      return { handled: 'unhandled', type };
  }
}

export default handleStripeEvent;
