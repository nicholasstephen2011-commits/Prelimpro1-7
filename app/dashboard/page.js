'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { pricingTiers } from '../../constants/pricing'
import { useOrg, useCurrentRole } from '../../contexts/OrgContext'

export default function DashboardPage() {
  const router = useRouter()
  const { currentOrg, loading: orgLoading, createOrg, refresh } = useOrg()
  const { isAdmin, roleLoading } = useCurrentRole()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')

  // Temporary Supabase connection check on mount
  useEffect(() => {
    let isActive = true

    const runHealthCheck = async () => {
      const { data, error: queryError } = await supabase.from('todos').select('*').limit(1)
      if (!isActive) return
      if (queryError) {
        console.error('Supabase connection test failed:', queryError)
      } else {
        console.log('Supabase connected!', data)
      }
    }

    runHealthCheck()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!data?.user) {
        router.replace('/auth')
      } else {
        setUser(data.user)
        setLoading(false)
      }
    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!isMounted) return
      if (!session?.user) {
        router.replace('/auth')
      } else {
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [router, isAdmin])

  const handleBilling = useCallback(async () => {
    if (!isAdmin) {
      setError('Admin access required to manage billing')
      return
    }
    try {
      setPortalLoading(true)
      setError('')
      const response = await fetch('/api/create-portal-session', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to start billing session')
      const data = await response.json()
      if (!data?.url) throw new Error('Missing billing portal link')
      router.push(data.url)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setPortalLoading(false)
    }
  }, [router, isAdmin])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }, [router])

  const handleUpgrade = useCallback(async (planId = 'basic') => {
    if (!isAdmin) {
      setError('Admin access required to upgrade')
      return
    }
    const tier = pricingTiers.find((p) => p.id === planId)
    if (!tier) {
      setError('Plan not found')
      return
    }

    if (tier.contactLink) {
      window.open(tier.contactLink, '_blank', 'noopener,noreferrer')
      return
    }

    const priceId = tier.priceIdMonthly || tier.priceIdAnnual
    if (!priceId) {
      setError('No price configured for this plan')
      return
    }

    try {
      setCheckoutLoading(true)
      setError('')

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          metadata: {
            plan: tier.id,
            billingCycle: tier.priceIdMonthly ? 'monthly' : 'annual',
            source: 'dashboard-web',
          },
        }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error || 'Unable to start checkout')
      }

      const data = await response.json()
      if (!data?.url) throw new Error('Missing checkout URL')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setCheckoutLoading(false)
    }
  }, [isAdmin])

  if (loading || orgLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
          <p className="text-sm font-semibold text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Create an organization to continue</h1>
          <p className="text-sm text-gray-600">We need a workspace to attach billing and notices.</p>
          <div className="flex gap-3">
            <button
              onClick={() => createOrg()}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create organization
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-600">Signed in as {user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Logout
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Home
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Billing</h2>
                  <p className="mt-1 text-sm text-gray-600">Manage payment methods and invoices.</p>
                </div>
                <button
                  onClick={handleBilling}
                  disabled={portalLoading || !isAdmin}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {portalLoading ? 'Opening…' : isAdmin ? 'Manage Billing' : 'Admin only'}
                </button>
              </div>
              {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Subscriptions</h2>
                  <p className="mt-1 text-sm text-gray-600">Choose a plan; you can upgrade anytime.</p>
                </div>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={checkoutLoading || !isAdmin}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {checkoutLoading ? 'Redirecting…' : isAdmin ? 'Upgrade subscription' : 'Admin only'}
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {pricingTiers.map((tier) => (
                  <div key={tier.id} className="rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tier.badge || 'Plan'}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                        <p className="text-sm text-gray-600">{tier.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{tier.monthlyPrice || tier.annualPrice || 'Contact'}</p>
                        <p className="text-xs text-gray-500">{tier.annualPrice ? 'Monthly / Annual options' : tier.contactLink ? 'Contact sales' : 'Included'}</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-gray-700">
                      {tier.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 text-blue-600">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={checkoutLoading || !isAdmin}
                        className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-500"
                      >
                        {checkoutLoading
                          ? 'Redirecting…'
                          : !isAdmin
                            ? 'Admin only'
                            : tier.contactLink
                              ? 'Contact sales'
                              : 'Select plan'}
                      </button>
                      {tier.contactLink ? (
                        <a
                          href={tier.contactLink}
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Email sales
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Account</h2>
                  <p className="mt-1 text-sm text-gray-600">Your authentication details.</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{user?.email}</dd>
                </div>
                <div className="rounded-lg border border-gray-100 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</dt>
                  <dd className="mt-1 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Active</dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Quick links</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-700">
                <li>
                  <Link href="/" className="hover:underline">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/mock-customer-portal" className="hover:underline">
                    Mock customer portal
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="hover:underline">
                    Templates index
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
