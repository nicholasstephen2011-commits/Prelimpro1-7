import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  CREATE_CHECKOUT_SESSION_URL,
  STRIPE_CANCEL_URL,
  PRICE_BASIC_ANNUAL,
  PRICE_BASIC_MONTHLY,
  PRICE_BUSINESS_ANNUAL,
  PRICE_BUSINESS_MONTHLY,
  PRICE_PRO_ANNUAL,
  PRICE_PRO_MONTHLY,
  STRIPE_SUCCESS_URL,
} from '../constants/billing';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export type StripePriceId =
  | typeof PRICE_BASIC_MONTHLY
  | typeof PRICE_BASIC_ANNUAL
  | typeof PRICE_PRO_MONTHLY
  | typeof PRICE_PRO_ANNUAL
  | typeof PRICE_BUSINESS_MONTHLY
  | typeof PRICE_BUSINESS_ANNUAL;

interface CreateCheckoutParams {
  priceId: StripePriceId;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

interface CheckoutSessionResponse {
  url: string;
  sessionId?: string;
}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Calls the (future) Supabase Edge Function that creates a Stripe Checkout Session.
 * This remains client-side until the secure backend is available.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
  const response = await fetch(CREATE_CHECKOUT_SESSION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Supabase Edge Functions typically require anon key for auth
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } : {}),
    },
    body: JSON.stringify({
      priceId: params.priceId,
      successUrl: STRIPE_SUCCESS_URL,
      cancelUrl: STRIPE_CANCEL_URL,
      customerEmail: params.customerEmail,
      metadata: params.metadata || {},
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to start checkout. Please try again.');
  }

  const data = (await response.json()) as Partial<CheckoutSessionResponse>;
  if (!data.url) {
    throw new Error('Checkout URL missing from response.');
  }

  return {
    url: data.url,
    sessionId: data.sessionId,
  };
}

/**
 * Opens the Stripe Checkout URL using Expo WebBrowser on native and a normal redirect on web.
 */
export async function openCheckoutUrl(url: string) {
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    enableBarCollapsing: true,
  });
}

export const stripeCheckout = {
  createCheckoutSession,
  openCheckoutUrl,
  isNative,
};
