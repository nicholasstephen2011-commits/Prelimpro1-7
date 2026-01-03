'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useOrg } from '../../contexts/OrgContext'
import RoleBadge from '../../components/RoleBadge'

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unexpected error')

interface NoticeRow {
  id: string
  title: string | null
  type: string | null
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
  mailed: 'bg-blue-50 text-blue-800',
}

const formatDate = (date: string | null | undefined) => (date ? new Date(date).toLocaleDateString() : '—')

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
          .select('*')
          .eq('org_id', currentOrg.org_id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (fetchError) throw fetchError
        setNotices(data || [])
      } catch (err: unknown) {
        const message = getErrorMessage(err) || 'Unable to load notices'
        setError(message)
        toast.error(message)
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">Checking your session...</div>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent notices</h2>
              <p className="text-sm text-gray-600">Latest 20 notices for this organization.</p>
            </div>
            <Link href="/templates" className="text-sm font-semibold text-blue-700 hover:underline">
              Create a notice
            </Link>
          </div>

          {loadingNotices ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-32 animate-pulse rounded-xl border border-gray-100 bg-gray-50"
                >
                  <div className="h-full rounded-xl bg-gradient-to-br from-gray-100 to-gray-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : notices.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No notices yet - start from Templates.</p>
              <Link
                href="/templates"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Browse templates
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notices.map((notice) => {
                const statusKey = (notice.status || 'draft').toLowerCase()
                return (
                  <div key={notice.id} className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-50">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{notice.type || notice.title || 'Notice'}</p>
                          <p className="text-xs font-medium text-blue-700">{notice.state || 'Unknown state'}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[statusKey] || 'bg-gray-100 text-gray-800'}`}>
                          {notice.status || 'draft'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{notice.project_address || 'No project address'}</p>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatDate(notice.created_at)}</span>
                        <span className="font-semibold text-gray-900">{formatAmount(notice.amount)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={`/notice/${notice.id}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/notice/${notice.id}`}
                        className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 transition hover:border-blue-200 hover:bg-blue-100"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Upcoming deadlines</p>
          <p className="mt-1 text-gray-600">Add project deadlines to see them here. (Coming soon)</p>
        </section>
      </div>
    </div>
  )
}
