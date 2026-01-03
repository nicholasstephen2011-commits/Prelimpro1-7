// PrelimPro pricing - keep all IDs explicit (replace with live/test IDs as needed)

// Basic (Unlimited Solo) — $35/mo or $290/yr
export const PRICE_BASIC_MONTHLY = 'price_basic_monthly';
export const PRICE_BASIC_ANNUAL = 'price_basic_annual';

// Pro (Team) — $71/mo or $590/yr
export const PRICE_PRO_MONTHLY = 'price_pro_monthly';
export const PRICE_PRO_ANNUAL = 'price_pro_annual';

// Business (Admin tools) — $131/mo or $1,030/yr
export const PRICE_BUSINESS_MONTHLY = 'price_business_monthly';
export const PRICE_BUSINESS_ANNUAL = 'price_business_annual';

// Pay-Per-Notice fallback
export const PRICE_PER_NOTICE_STANDARD = 'price_per_notice_standard';
export const PRICE_PER_NOTICE_CERTIFIED = 'price_per_notice_certified';
export const PRICE_PER_NOTICE_PRIORITY = 'price_per_notice_priority';
// State premium variants (e.g., Ohio $70 placeholder IDs)
export const PRICE_PER_NOTICE_CERTIFIED_OH = 'price_per_notice_certified_oh';
export const PRICE_PER_NOTICE_PRIORITY_OH = 'price_per_notice_priority_oh';
// Bundled priority + certified option
export const PRICE_PER_NOTICE_PRIORITY_CERTIFIED = 'price_per_notice_priority_certified';
export const PRICE_PER_NOTICE_PRIORITY_CERTIFIED_OH = 'price_per_notice_priority_certified_oh';

// Corporate/Custom: no price ID (contact flow)
export const CORPORATE_CONTACT_EMAIL = 'sales@premiumlien.com';
export const CORPORATE_PLAN = {
	displayName: 'Corporate',
	annualMinimumUsd: 10000,
	includedSeats: 20,
	includedNoticesPerMonth: 200,
	seatPriceMonthlyUsd: 25,
	overagePerNoticeUsd: 3,
	pilotCapUsd: 5000,
	blurb:
		'Starts at $10k/yr, includes 20 seats and 200 notices/mo; $25/seat/mo over 20; $3/notice overage; invoice, net 30/45.',
};

// Supabase Edge Function endpoint (live)
export const CREATE_CHECKOUT_SESSION_URL = 'https://zengdjsrnqzhxzbsldh.supabase.co/functions/v1/create-checkout-session';

// Success/Cancel redirect targets
export const STRIPE_SUCCESS_URL = 'https://premiumlien.com/success?session_id={CHECKOUT_SESSION_ID}';
export const STRIPE_CANCEL_URL = 'https://premiumlien.com/cancel';