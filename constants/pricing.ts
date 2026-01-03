import {
  CORPORATE_CONTACT_EMAIL,
  CORPORATE_PLAN,
  PRICE_BASIC_ANNUAL,
  PRICE_BASIC_MONTHLY,
  PRICE_BUSINESS_ANNUAL,
  PRICE_BUSINESS_MONTHLY,
  PRICE_PRO_ANNUAL,
  PRICE_PRO_MONTHLY,
} from './billing'

export type PriceId = string

export interface PricingTier {
  id: 'free' | 'basic' | 'pro' | 'business' | 'corporate'
  name: string
  monthlyPrice?: string
  annualPrice?: string
  description: string
  features: string[]
  badge?: string
  savings?: string
  priceIdMonthly?: PriceId
  priceIdAnnual?: PriceId
  contactLink?: string
  isFree?: boolean
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    description: '3 preliminary notices per month. Mailing is pay-per-notice.',
    features: [
      '3 notices/month included',
      'Pay-per mailing (standard/certified/priority)',
      'Basic reminders, single user',
    ],
    isFree: true,
  },
  {
    id: 'basic',
    name: 'Basic (Solo Unlimited)',
    monthlyPrice: '$35',
    annualPrice: '$290',
    description: 'Unlimited notices for solo users. Mailing is pay-per-notice.',
    features: [
      'Unlimited notices',
      'Pay-per mailing (standard/certified/priority)',
      'Automatic reminders + push',
      'Unlimited project storage',
      'Single user',
    ],
    priceIdMonthly: PRICE_BASIC_MONTHLY,
    priceIdAnnual: PRICE_BASIC_ANNUAL,
    savings: 'Save ~31% on annual',
  },
  {
    id: 'pro',
    name: 'Pro (Team + Priority)',
    monthlyPrice: '$71',
    annualPrice: '$590',
    description: 'Teams up to 5 users with exports and priority support. Mailing is pay-per-notice.',
    features: [
      'Unlimited notices',
      'Team support (up to 5 users)',
      'Export CSV/PDF',
      'Priority support',
      'Custom logo branding',
      'Pay-per mailing (standard/certified/priority)',
    ],
    priceIdMonthly: PRICE_PRO_MONTHLY,
    priceIdAnnual: PRICE_PRO_ANNUAL,
    badge: 'Best for teams',
    savings: 'Save ~31% on annual',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: '$131',
    annualPrice: '$1,030',
    description: 'Unlimited users with admin tools and volume discounts. Mailing is pay-per-notice.',
    features: [
      'Unlimited notices & users',
      'Admin controls, audit logs, bulk invoicing',
      'Volume discounts',
      'Priority support, onboarding assistance',
      'Pay-per mailing (standard/certified/priority)',
    ],
    priceIdMonthly: PRICE_BUSINESS_MONTHLY,
    priceIdAnnual: PRICE_BUSINESS_ANNUAL,
    badge: 'Popular for ops',
    savings: 'Save ~34% on annual',
  },
  {
    id: 'corporate',
    name: 'Corporate (Enterprise)',
    monthlyPrice: `$${CORPORATE_PLAN.seatPriceMonthlyUsd}/seat`,
    annualPrice: `$${CORPORATE_PLAN.annualMinimumUsd}/yr min`,
    description: `Starts at $${CORPORATE_PLAN.annualMinimumUsd}/yr with ${CORPORATE_PLAN.includedSeats} seats and ${CORPORATE_PLAN.includedNoticesPerMonth} notices/month included.`,
    features: [
      `${CORPORATE_PLAN.includedSeats} seats included; $${CORPORATE_PLAN.seatPriceMonthlyUsd}/seat/mo over bundle`,
      `${CORPORATE_PLAN.includedNoticesPerMonth} notices/month included; $${CORPORATE_PLAN.overagePerNoticeUsd} per extra notice`,
      'SSO, audit trails, dedicated support',
      'Invoice (ACH/wire), custom SLAs, API access',
    ],
    contactLink: `mailto:${CORPORATE_CONTACT_EMAIL}?subject=PrelimPro%20Corporate&body=Share%20seat%20count%2C%20notice%20volume%2C%20and%20target%20start%20date.`,
    badge: 'Talk to sales',
  },
]
