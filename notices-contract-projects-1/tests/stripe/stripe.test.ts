import { handleStripeEvent } from '../../lib/stripe';

describe('Stripe event handler', () => {
  test('handles payment_intent.succeeded', async () => {
    const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } };
    const res = await handleStripeEvent(event as any);
    expect(res.handled).toBe('payment_intent.succeeded');
    expect(res.id).toBe('pi_123');
  });

  test('handles invoice.payment_failed', async () => {
    const event = { type: 'invoice.payment_failed', data: { object: { id: 'in_456' } } };
    const res = await handleStripeEvent(event as any);
    expect(res.handled).toBe('invoice.payment_failed');
    expect(res.id).toBe('in_456');
  });

  test('returns unhandled for unknown events', async () => {
    const event = { type: 'random.event' };
    const res = await handleStripeEvent(event as any);
    expect(res.handled).toBe('unhandled');
    expect(res.type).toBe('random.event');
  });
});
