'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const PAGE_SIZE = 10

function formatMoney(amount) {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusStyles(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid':
      return 'text-green-700 bg-green-50 border-green-100'
    case 'unpaid':
    case 'open':
      return 'text-amber-700 bg-amber-50 border-amber-100'
    case 'failed':
    case 'void':
      return 'text-red-700 bg-red-50 border-red-100'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-100'
  }
}

export default function CustomerPortal() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState(null)

  const [subscription, setSubscription] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [invoices, setInvoices] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      setLoadingUser(true)
      const { data, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !data?.user) {
        setUser(null)
        setError(userError ? userError.message : null)
        setLoadingUser(false)
        setLoadingData(false)
        return
      }
      setUser(data.user)
      setLoadingUser(false)
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadData() {
      setLoadingData(true)
      setError(null)
      try {
        const [subRes, pmRes, invoiceRes] = await Promise.all([
          supabase.from('subscriptions').select('*').eq('user_id', user.id).order('next_billing_date', { ascending: true }).limit(1),
          supabase.from('payment_methods').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1),
          supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(50),
        ])

        if (!cancelled) {
          setSubscription(subRes.data?.[0] || null)
          setPaymentMethod(pmRes.data?.[0] || null)
          setInvoices(invoiceRes.data || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    loadData()

    const channel = supabase
      .channel(`portal-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods', filter: `user_id=eq.${user.id}` }, loadData)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user])

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    return (invoices || []).filter((inv) => {
      const haystack = `${inv.invoice_number || ''} ${inv.status || ''} ${inv.amount || ''}`.toLowerCase()
      if (q && !haystack.includes(q)) return false

      if (statusFilter && inv.status?.toLowerCase() !== statusFilter.toLowerCase()) return false

      const invDate = inv.date ? new Date(inv.date) : null
      if (start && invDate && invDate < start) return false
      if (end && invDate && invDate > end) return false

      return true
    })
  }, [invoices, search, statusFilter, startDate, endDate])

  const pagedInvoices = useMemo(() => {
    const endIdx = page * PAGE_SIZE
    return filteredInvoices.slice(0, endIdx)
  }, [filteredInvoices, page])

  function resetPagination() {
    setPage(1)
  }

  useEffect(() => {
    resetPagination()
  }, [search, statusFilter, startDate, endDate])

  const hasMore = filteredInvoices.length > pagedInvoices.length

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="text-sm text-gray-600">Checking session…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100 text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Please log in</h1>
          <p className="text-sm text-gray-600">You need an account to view your billing portal.</p>
          <div className="flex justify-center gap-3">
            <Link href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
              Log in
            </Link>
            <Link href="/" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-800 border border-gray-200 hover:bg-gray-50">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Customer Portal</h1>
            <p className="mt-1 text-gray-600">Live billing data for your account.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-800 border border-gray-200 hover:bg-gray-50">
              Dashboard
            </Link>
            <Link href="/" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
              Back to Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 text-sm">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white shadow rounded-xl p-6 border border-gray-100 min-h-[160px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
              {loadingData && <span className="text-xs text-gray-500">Loading…</span>}
            </div>
            {loadingData ? (
              <Skeleton lines={3} />
            ) : subscription ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-900 font-semibold">{subscription.plan_name || 'Plan'}</p>
                <p className="text-sm text-gray-700">{formatMoney(subscription.price_monthly)} / month</p>
                <p className="text-sm text-gray-600">Next billing: {formatDate(subscription.next_billing_date)}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles(subscription.status)}`}>
                  {subscription.status || 'unknown'}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No active plan.</p>
            )}
          </div>

          <div className="bg-white shadow rounded-xl p-6 border border-gray-100 min-h-[160px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
              {loadingData && <span className="text-xs text-gray-500">Loading…</span>}
            </div>
            {loadingData ? (
              <Skeleton lines={3} />
            ) : paymentMethod ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-900 font-semibold">{paymentMethod.card_brand || 'Card'} ****{paymentMethod.last4}</p>
                <p className="text-sm text-gray-700">Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">Add a payment method to avoid interruptions.</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices"
                className="w-full sm:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="open">Open</option>
                <option value="failed">Failed</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loadingData ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No invoices found.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pagedInvoices.map((inv) => (
                <div key={inv.id || inv.invoice_number} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Invoice {inv.invoice_number || '—'}</p>
                      <p className="text-sm text-gray-700">{formatMoney(inv.amount)} — {inv.status || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{formatDate(inv.date)}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles(inv.status)}`}>
                      {inv.status || 'status'}
                    </span>
                  </div>
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
                    >
                      View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Load more
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Data shown is scoped to the authenticated user. Ensure RLS policies enforce user_id filtering on subscriptions, payment_methods, and invoices.
        </div>
      </div>
    </div>
  )
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-2 mt-3">
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className="h-3 rounded bg-gray-200" />
      ))}
    </div>
  )
}
