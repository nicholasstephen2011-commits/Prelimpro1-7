import Link from 'next/link'
import { pricingTiers } from '../../constants/pricing'

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Plans & Pricing</p>
          <h1 className="text-3xl font-bold text-gray-900">Choose a plan that fits</h1>
          <p className="text-sm text-gray-600">Select a subscription to unlock notices, exports, and team features.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {pricingTiers.map((tier) => (
            <div key={tier.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tier.badge || 'Plan'}</p>
                  <h2 className="text-lg font-semibold text-gray-900">{tier.name}</h2>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{tier.monthlyPrice || tier.annualPrice || 'Contact'}</p>
                  <p className="text-xs text-gray-500">{tier.annualPrice ? 'Monthly / Annual options' : tier.contactLink ? 'Contact sales' : 'Included'}</p>
                  {tier.savings ? <p className="text-xs font-semibold text-blue-700">{tier.savings}</p> : null}
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-700">
                {tier.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {tier.contactLink ? (
                  <a
                    href={tier.contactLink}
                    className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Contact sales
                  </a>
                ) : (
                  <Link
                    href={`/upgrade?plan=${tier.id}`}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Select plan
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
