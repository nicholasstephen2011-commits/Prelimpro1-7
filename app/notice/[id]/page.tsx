"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { useOrg } from '../../../contexts/OrgContext'

interface NoticeRecord {
  id: string
  org_id: string
  title: string | null
  type: string | null
  state: string | null
  content: string | null
  project_address: string | null
  owner_name: string | null
  amount: number | null
  service_dates: string | null
  deadline_date: string | null
  status: string | null
  sent_at: string | null
  created_at: string
}

const statusStyles: Record<string, string> = {
  sent: 'bg-green-50 text-green-800',
  paid: 'bg-green-50 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-amber-50 text-amber-800',
  failed: 'bg-red-50 text-red-800',
  mailed: 'bg-blue-50 text-blue-800',
}

const formatAmount = (amount: number | null | undefined): string => {
  if (amount == null || Number.isNaN(amount)) return '--'
  return `$${amount.toFixed(2)}`
}

const formatDate = (date: string | null | undefined) => (date ? new Date(date).toLocaleString() : '--')

export default function NoticeDetailPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState<NoticeRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const noticeId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) return raw[0]
    return raw
  }, [params])

  useEffect(() => {
    if (!noticeId || !currentOrg) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('notices')
          .select('*')
          .eq('id', noticeId)
          .eq('org_id', currentOrg.org_id)
          .maybeSingle<NoticeRecord>()

        if (fetchError) throw fetchError
        if (!data) {
          setError('Notice not found for this organization')
          toast.error('Notice not found')
          return
        }

        setNotice(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load notice'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentOrg, noticeId])

  const handleEdit = () => {
    if (!notice) return
    if (typeof window !== 'undefined') {
      const prefillPayload = {
        template: undefined,
        stateName: notice.state || undefined,
        mergedText: notice.content || undefined,
        placeholders: {
          project_address: notice.project_address || '',
          owner_name: notice.owner_name || '',
          amount_owed: notice.amount != null ? String(notice.amount) : '',
          service_dates: notice.service_dates || '',
          deadline_date: notice.deadline_date || '',
          project_description: '',
        },
      }
      window.sessionStorage.setItem('notice_prefill', JSON.stringify(prefillPayload))
    }
    router.push('/new-notice?prefill=true')
  }

  const handleSend = async () => {
    if (!notice || sending || !currentOrg) return
    setSending(true)
    try {
      const { error: updateError } = await supabase
        .from('notices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notice.id)
        .eq('org_id', currentOrg.org_id)

      if (updateError) throw updateError
      setNotice((prev) => (prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev))
      toast.success('Notice marked as sent')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send notice'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  const handleDownload = () => {
    if (!notice || downloading) return
    setDownloading(true)
    try {
      const printableHtml = `<!doctype html><html><head><title>Notice ${notice.id}</title></head><body>${
        notice.content || 'No content available'
      }</body></html>`
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Popup blocked. Allow popups to download the PDF.')
      }
      printWindow.document.write(printableHtml)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      toast.success('Print dialog opened to save as PDF')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to download PDF'
      toast.error(message)
    } finally {
      setDownloading(false)
    }
  }

  const statusKey = (notice?.status || 'draft').toLowerCase()

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Notice</p>
            <h1 className="text-3xl font-bold text-gray-900">{notice?.title || notice?.type || 'Notice details'}</h1>
            <p className="text-sm text-gray-600">Review, edit, and download this notice.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:text-gray-900"
            >
              Back to dashboard
            </Link>
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || notice?.status === 'sent'}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {notice?.status === 'sent' ? 'Sent' : sending ? 'Sending...' : 'Send'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 disabled:opacity-60"
            >
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : notice ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[statusKey] || 'bg-gray-100 text-gray-800'}`}>
                    {notice.status || 'draft'}
                  </span>
                  <span className="text-xs text-gray-500">Created {formatDate(notice.created_at)}</span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</p>
                <p className="text-lg font-bold text-gray-900">{formatAmount(notice.amount)}</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{notice.project_address || 'No project address'}</p>
                <p className="text-xs text-gray-600">{notice.state || 'Unknown state'}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</p>
                <p className="text-sm text-gray-800">{notice.owner_name || 'Owner not provided'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Key dates</p>
                <p className="mt-1 text-sm text-gray-800">Service: {notice.service_dates || 'Not set'}</p>
                <p className="text-sm text-gray-800">Deadline: {notice.deadline_date || 'Not set'}</p>
                <p className="text-sm text-gray-800">Sent at: {formatDate(notice.sent_at)}</p>
              </div>
            </div>

            <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Content</p>
                  <h2 className="text-xl font-bold text-gray-900">{notice.title || notice.type || 'Notice content'}</h2>
                </div>
                <span className="text-xs font-semibold text-blue-700">Rich text preview</span>
              </div>
              <div className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4 text-gray-900 shadow-inner" dangerouslySetInnerHTML={{ __html: notice.content || '<p>No content available.</p>' }} />
            </section>

            <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">History</p>
              <p className="text-xs text-gray-600">Delivery and audit history will appear here.</p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
