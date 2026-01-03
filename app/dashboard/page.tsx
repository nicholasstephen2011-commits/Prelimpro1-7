'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useOrg } from '../../contexts/OrgContext'
import RoleBadge from '../../components/RoleBadge'

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unexpected error')

interface NoticeRow {
  id: string
  title: string | null
  state: string | null
  amount: number | null
  status: string | null
  created_at: string
  project_address: string | null
}

interface SubscriptionRow {
  plan: string | null
  status: string | null
  current_period_end: string | null
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return `$${amount.toFixed(2)}`
}

const statusStyles: Record<string, string> = {
  sent: 'bg-green-50 text-green-800',
  paid: 'bg-green-50 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-amber-50 text-amber-800',
  failed: 'bg-red-50 text-red-800',
}

export default function DashboardPage() {
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [checkingSession, setCheckingSession] = useState(true)
  const [loadingNotices, setLoadingNotices] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)

  // Enforce auth on load
  useEffect(() => {
    let active = true
    const verify = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (!data?.session) {
        router.replace('/auth?redirect=/dashboard&error=auth_required')
        return
      }
      setCheckingSession(false)
    }
    verify()
    return () => {
      active = false
    }
  }, [router])

  // Load recent notices for the current org
  useEffect(() => {
    if (!currentOrg || checkingSession) return

    const loadNotices = async () => {
      setLoadingNotices(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('notices')
          .select('id, title, state, project_address, amount, status, created_at')
          .eq('org_id', currentOrg.org_id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (fetchError) throw fetchError
        setNotices(data || [])
      } catch (err: unknown) {
        setError(getErrorMessage(err) || 'Unable to load notices')
      } finally {
        setLoadingNotices(false)
      }
    }

    loadNotices()
  }, [currentOrg, checkingSession])

  // Attempt to load subscription info when Stripe customer exists
  useEffect(() => {
    if (!currentOrg?.stripe_customer_id || checkingSession) return

    const loadSubscription = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end')
          .eq('customer_id', currentOrg.stripe_customer_id)
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle<SubscriptionRow>()

        // Ignore missing table or missing row errors gracefully
        if (fetchError && fetchError.code !== 'PGRST116') {
          if (!fetchError.message?.includes('relation "subscriptions" does not exist')) {
            console.warn('Subscription fetch error:', fetchError.message)
          }
          return
        }

        if (data) setSubscription(data)
      } catch (err: unknown) {
        console.warn('Subscription fetch error:', getErrorMessage(err))
      }
    }

    loadSubscription()
  }, [currentOrg?.stripe_customer_id, checkingSession])

  const planName = subscription?.plan || (currentOrg?.stripe_customer_id ? 'Paid customer' : 'Free plan')
  const planStatus = subscription?.status || (currentOrg?.stripe_customer_id ? 'active' : 'inactive')
  const nextBilling = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : currentOrg?.stripe_customer_id
      ? 'See portal'
      : 'Not set'
  const orgName = currentOrg?.org_name || 'Your organization'
  const noticesThisMonth = useMemo(() => {
    const start = new Date()
    start.setDate(1)
    return notices.filter((n) => new Date(n.created_at) >= start).length
  }, [notices])

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">Checking your session…</div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {orgName}</h1>
            <p className="text-sm text-gray-600">Track notices, templates, and billing in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{planName}</span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notices this month</p>
                <p className="text-3xl font-bold text-gray-900">{noticesThisMonth}</p>
                <p className="text-sm text-gray-600">Sent or drafted since the start of the month.</p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{orgName}</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Subscription</p>
                <p className="text-2xl font-bold text-gray-900">{planName}</p>
                <p className="text-sm text-gray-600">Status: {planStatus}</p>
                <p className="text-sm text-gray-600">Next billing: {nextBilling}</p>
              </div>
              <Link
                href="/mock-customer-portal"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Billing portal
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[{ title: 'New Notice', href: '/new-notice' }, { title: 'Templates', href: '/templates' }, { title: 'Customer Template', href: '/settings' }, { title: 'Upgrade', href: '/upgrade' }].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex h-full items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:-translate-y-1 hover:shadow"
            >
              <span>{action.title}</span>
              <span className="text-xs font-medium text-blue-700">Go</span>
            </Link>
          ))}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent notices</h2>
              <p className="text-sm text-gray-600">Last 10 notices for this organization.</p>
            </div>
            <Link href="/templates" className="text-sm font-semibold text-blue-700 hover:underline">
              Create a notice
            </Link>
          </div>
          <div className="mt-4 divide-y divide-gray-100">
            {loadingNotices ? (
              <div className="py-6 text-sm text-gray-500">Loading notices…</div>
            ) : error ? (
              <div className="py-6 text-sm text-red-600">{error}</div>
            ) : notices.length === 0 ? (
              <div className="py-6 text-sm text-gray-600">No notices yet. Get started by creating one.</div>
            ) : (
              notices.map((notice) => (
                <div key={notice.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{notice.title || 'Untitled notice'}</p>
                    <p className="text-xs text-gray-600">{notice.state || 'Unknown state'} • {notice.project_address || 'No project address'}</p>
                    <p className="text-xs text-gray-500">{new Date(notice.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`rounded-full px-3 py-1 ${statusStyles[(notice.status || 'draft').toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
                      {notice.status || 'draft'}
                    </span>
                    <span className="text-gray-700">{formatAmount(notice.amount)}</span>
                    <Link href={`/notices/${notice.id}`} className="text-blue-700 hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Upcoming deadlines</p>
          <p className="mt-1 text-gray-600">Add project deadlines to see them here. (Coming soon)</p>
        </section>
      </div>
    </div>
  )
}
