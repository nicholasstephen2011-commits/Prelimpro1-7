// Mock endpoint for customer portal; replace with real Stripe billing portal session creation
export async function POST() {
  return Response.json({ url: '/mock-customer-portal' })
}
