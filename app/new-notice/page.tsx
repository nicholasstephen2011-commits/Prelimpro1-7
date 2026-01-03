"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import { DEFAULT_CUSTOMER_PLACEHOLDERS, CustomerPlaceholderMap, fillPlaceholders, getStateTemplateBySlug } from '../../constants/stateTemplates'
import { toast } from 'react-hot-toast'
import { useOrg } from '../../contexts/OrgContext'
import { supabase } from '../../lib/supabaseClient'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="text-sm text-gray-500">Loading editor…</div>,
})

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unexpected error')

interface PrefillPayload {
  template?: string
  stateName?: string
  mergedText?: string
  placeholders?: Record<string, string>
}

interface NoticeFormState {
  title: string
  template?: string
  stateName?: string
  projectAddress: string
  ownerName: string
  amountOwed: string
  serviceDates: string
  deadlineDate: string
  description: string
  content: string
}

const emptyForm: NoticeFormState = {
  title: 'Preliminary Notice',
  template: undefined,
  stateName: undefined,
  projectAddress: '',
  ownerName: '',
  amountOwed: '',
  serviceDates: '',
  deadlineDate: '',
  description: '',
  content: '',
}

export default function NewNoticePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [form, setForm] = useState<NoticeFormState>(emptyForm)
  const [customerValues, setCustomerValues] = useState<CustomerPlaceholderMap>(DEFAULT_CUSTOMER_PLACEHOLDERS)
  const [templateSlug, setTemplateSlug] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const template = useMemo(() => (templateSlug ? getStateTemplateBySlug(templateSlug) : null), [templateSlug])

  // Load customer template and prefill payload
  useEffect(() => {
    const slugFromQuery = searchParams.get('template') || undefined
    setTemplateSlug(slugFromQuery)

    const load = async () => {
      try {
        if (!currentOrg) {
          setCustomerValues(DEFAULT_CUSTOMER_PLACEHOLDERS)
        } else {
          const { data, error: fetchError } = await supabase
            .from('customer_templates')
            .select('business_name, company_name, address, phone, email, tax_id, website')
            .eq('org_id', currentOrg.org_id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

          if (data) {
            setCustomerValues({
              business_name: data.business_name || DEFAULT_CUSTOMER_PLACEHOLDERS.business_name,
              company_name: data.company_name || DEFAULT_CUSTOMER_PLACEHOLDERS.company_name,
              address: data.address || DEFAULT_CUSTOMER_PLACEHOLDERS.address,
              phone: data.phone || DEFAULT_CUSTOMER_PLACEHOLDERS.phone,
              email: data.email || DEFAULT_CUSTOMER_PLACEHOLDERS.email,
              tax_id: data.tax_id || DEFAULT_CUSTOMER_PLACEHOLDERS.tax_id,
              website: data.website || DEFAULT_CUSTOMER_PLACEHOLDERS.website,
            })
          }
        }

        const prefill = searchParams.get('prefill') === 'true'
        if (prefill && typeof window !== 'undefined') {
          const stored = window.sessionStorage.getItem('notice_prefill')
          if (stored) {
            const payload = JSON.parse(stored) as PrefillPayload
            setTemplateSlug(payload.template || slugFromQuery || payload.stateName?.toLowerCase().replace(/\s+/g, '-'))
            setForm((prev) => ({
              ...prev,
              template: payload.template || slugFromQuery,
              stateName: payload.stateName,
              title: `Preliminary Notice${payload.stateName ? ` - ${payload.stateName}` : ''}`,
              projectAddress: payload.placeholders?.project_address || '',
              ownerName: payload.placeholders?.owner_name || '',
              amountOwed: payload.placeholders?.amount_owed || '',
              serviceDates: payload.placeholders?.service_dates || '',
              deadlineDate: payload.placeholders?.deadline_date || '',
              description: payload.placeholders?.project_description || '',
              content: payload.mergedText || prev.content,
            }))
          }
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err) || 'Could not load prefill data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentOrg, searchParams])

  const placeholders = useMemo(() => {
    return {
      ...DEFAULT_CUSTOMER_PLACEHOLDERS,
      ...customerValues,
      project_address: form.projectAddress,
      owner_name: form.ownerName,
      amount_owed: form.amountOwed,
      service_dates: form.serviceDates,
      deadline_date: form.deadlineDate,
      project_description: form.description,
    }
  }, [customerValues, form.projectAddress, form.ownerName, form.amountOwed, form.serviceDates, form.deadlineDate, form.description])

  const mergedContent = useMemo(() => {
    if (!template) return ''
    return template.sections
      .map((section) => fillPlaceholders(section.content, placeholders))
      .filter(Boolean)
      .join('\n\n')
  }, [template, placeholders])

  // Keep content prefilled once template and placeholders are ready, but preserve user edits
  useEffect(() => {
    if (!template) return
    setForm((prev) => {
      if (prev.content) return prev
      return { ...prev, content: mergedContent, template: template.slug, stateName: template.fullName, title: `Preliminary Notice - ${template.fullName}` }
    })
  }, [template, mergedContent])

  const updateField = (key: keyof NoticeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const preview = useMemo(() => form.content || mergedContent, [form.content, mergedContent])

  const handleSubmit = async (action: 'save' | 'send') => {
    setError(null)
    setMessage(null)
    if (!currentOrg) {
      const msg = 'Select an organization first.'
      setError(msg)
      toast.error(msg)
      return
    }
    if (action === 'send' && (!form.projectAddress || !form.amountOwed)) {
      const msg = 'Project address and amount are required to send.'
      setError(msg)
      toast.error(msg)
      return
    }

    try {
      setSaving(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Sign in to save a notice')

      const contentToSave = form.content || mergedContent
      const amountNumber = form.amountOwed ? Number(form.amountOwed.toString().replace(/[^0-9.-]/g, '')) : null

      const payload = {
        org_id: currentOrg.org_id,
        user_id: user.id,
        state: template?.fullName || form.stateName || templateSlug,
        type: 'Preliminary Notice',
        content: contentToSave,
        project_address: form.projectAddress,
        owner_name: form.ownerName,
        amount: amountNumber,
        service_dates: form.serviceDates,
        deadline_date: form.deadlineDate || null,
        status: action === 'send' ? 'sent' : 'draft',
        sent_at: action === 'send' ? new Date().toISOString() : null,
      }

      const { error: insertError } = await supabase.from('notices').insert(payload)
      if (insertError) throw insertError

      const successMsg = action === 'send' ? 'Notice sent!' : 'Notice saved!'
      setMessage(successMsg)
      toast.success(successMsg)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = getErrorMessage(err) || 'Could not save notice'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">New notice</p>
            <h1 className="text-3xl font-bold text-gray-900">Start a notice</h1>
            <p className="text-sm text-gray-600">Prefilled from the state template. Edit before sending.</p>
          </div>
          <Link href="/templates" className="text-sm font-semibold text-blue-700 hover:underline">
            Back to templates
          </Link>
        </header>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {loading ? <p className="text-sm text-gray-500">Loading prefill…</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Title
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Template
            <input
              value={form.stateName || template?.fullName || form.template || ''}
              onChange={(e) => updateField('stateName', e.target.value)}
              placeholder="State template"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Project address
            <input
              value={form.projectAddress}
              onChange={(e) => updateField('projectAddress', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Owner name
            <input
              value={form.ownerName}
              onChange={(e) => updateField('ownerName', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Amount owed
            <input
              value={form.amountOwed}
              onChange={(e) => updateField('amountOwed', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Service dates
            <input
              value={form.serviceDates}
              onChange={(e) => updateField('serviceDates', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-800">
            Deadline date
            <input
              value={form.deadlineDate}
              onChange={(e) => updateField('deadlineDate', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm font-medium text-gray-800">
          Work description
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={2}
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-800">
          <span className="flex items-center justify-between">
            <span>Notice content</span>
            <span className="text-xs font-normal text-gray-500">Rich text supported</span>
          </span>
          <ReactQuill theme="snow" value={form.content || mergedContent} onChange={(val) => updateField('content', val)} className="bg-white" />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('save')}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('send')}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-60"
          >
            {saving ? 'Sending…' : 'Send notice'}
          </button>
        </div>

        <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Preview</p>
          <div className="whitespace-pre-line rounded-lg bg-white p-3 text-sm text-gray-800 ring-1 ring-gray-100">
            {preview || 'Content will appear here as you type.'}
          </div>
        </section>
      </div>
    </div>
  )
}
