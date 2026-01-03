import { NextResponse } from 'next/server'
import { CREATE_CHECKOUT_SESSION_URL } from '../../../constants/billing'

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { priceId, customerEmail, metadata = {} } = body || {}

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    const response = await fetch(CREATE_CHECKOUT_SESSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {}),
      },
      body: JSON.stringify({ priceId, customerEmail, metadata }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return NextResponse.json({ error: detail || 'Unable to start checkout' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
