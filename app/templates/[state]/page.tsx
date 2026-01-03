'use client'

import Link from 'next/link'
import { use as usePromise, useEffect, useMemo, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { Document, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from '@react-pdf/renderer'
import { DEFAULT_CUSTOMER_PLACEHOLDERS, CustomerPlaceholderMap, StateSection, fillPlaceholders, getStateTemplateBySlug } from '../../../constants/stateTemplates'
import { formatDate } from '../../../templates/notices/stateNoticeTemplates'
import { useOrg } from '../../../contexts/OrgContext'
import { supabase } from '../../../lib/supabaseClient'

interface CustomerTemplateRow {
  business_name: string | null
  company_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  website: string | null
}

const styles = StyleSheet.create({
  page: { padding: 72, fontSize: 12, color: '#111827', fontFamily: 'Helvetica' },
  heading: { fontSize: 18, marginBottom: 8, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' },
  subheading: { fontSize: 12, marginBottom: 12, color: '#1f2937', textAlign: 'center' },
  section: { marginBottom: 14 },
  label: { fontSize: 10, textTransform: 'uppercase', color: '#4b5563', marginBottom: 4, fontWeight: 'bold' },
  text: { fontSize: 11, lineHeight: 1.6, textAlign: 'justify' },
  headerBlock: { fontSize: 11, lineHeight: 1.5, textAlign: 'left' },
  warning: { color: '#b91c1c', fontWeight: 'bold' },
  blank: { textDecoration: 'underline' },
  footer: { fontSize: 9, color: '#6b7280', marginTop: 18, textAlign: 'center' },
})

type TemplateDescriptor = NonNullable<ReturnType<typeof getStateTemplateBySlug>>

function renderPdfSection(section: StateSection, idx: number, apply: (text: string) => string) {
  const text = apply(section.content)
  switch (section.type) {
    case 'header':
      return (
        <View key={`section-${idx}`} style={styles.section}>
          <Text style={styles.headerBlock}>{text}</Text>
        </View>
      )
    case 'title': {
      const [line1, ...rest] = text.split('\n')
      return (
        <View key={`section-${idx}`} style={styles.section}>
          <Text style={styles.heading}>{line1}</Text>
          {rest.length ? <Text style={styles.subheading}>{rest.join('\n')}</Text> : null}
        </View>
      )
    }
    case 'warning':
      return (
        <View key={`section-${idx}`} style={styles.section}>
          <Text style={styles.label}>Warning</Text>
          <Text style={[styles.text, styles.warning]}>{text}</Text>
        </View>
      )
    case 'blank':
      return (
        <View key={`section-${idx}`} style={styles.section}>
          {text.split('\n').map((line, lineIdx) => (
            <Text key={`blank-${idx}-${lineIdx}`} style={[styles.text, styles.blank]}>
              {line}
            </Text>
          ))}
        </View>
      )
    case 'signature':
      return (
        <View key={`section-${idx}`} style={styles.section}>
          <Text style={styles.label}>Signature</Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      )
    default:
      return (
        <View key={`section-${idx}`} style={styles.section}>
          <Text style={styles.text}>{text}</Text>
        </View>
      )
  }
}

function NoticeDocument({ template, data, generatedOn }: { template: TemplateDescriptor; data: CustomerPlaceholderMap; generatedOn: string }) {
  const placeholders = { ...DEFAULT_CUSTOMER_PLACEHOLDERS, ...data, state_name: template.fullName, generated_date: generatedOn }
  const apply = (text: string) => fillPlaceholders(text, placeholders)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {template.sections.map((section, idx) => renderPdfSection(section, idx, apply))}
        <Text style={styles.footer}>Generated {generatedOn} • Reference only; verify statutes and deadlines.</Text>
      </Page>
    </Document>
  )
}

export default function StateTemplatePage({ params }: { params: Promise<{ state: string }> }) {
  const resolvedParams = usePromise(params)
  const template = useMemo(() => getStateTemplateBySlug(resolvedParams.state), [resolvedParams.state])
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [customerValues, setCustomerValues] = useState<CustomerPlaceholderMap>(DEFAULT_CUSTOMER_PLACEHOLDERS)
  const [hasCustomerTemplate, setHasCustomerTemplate] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const loadTemplate = async () => {
      if (!currentOrg) {
        setHasCustomerTemplate(false)
        setCustomerValues(DEFAULT_CUSTOMER_PLACEHOLDERS)
        return
      }
      setLoadingTemplate(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('customer_templates')
          .select('business_name, company_name, address, phone, email, tax_id, website')
          .eq('org_id', currentOrg.org_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle<CustomerTemplateRow>()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        if (data) {
          setHasCustomerTemplate(true)
          setCustomerValues({
            business_name: data.business_name || DEFAULT_CUSTOMER_PLACEHOLDERS.business_name,
            company_name: data.company_name || DEFAULT_CUSTOMER_PLACEHOLDERS.company_name,
            address: data.address || DEFAULT_CUSTOMER_PLACEHOLDERS.address,
            phone: data.phone || DEFAULT_CUSTOMER_PLACEHOLDERS.phone,
            email: data.email || DEFAULT_CUSTOMER_PLACEHOLDERS.email,
            tax_id: data.tax_id || DEFAULT_CUSTOMER_PLACEHOLDERS.tax_id,
            website: data.website || DEFAULT_CUSTOMER_PLACEHOLDERS.website,
          })
        } else {
          setHasCustomerTemplate(false)
          setCustomerValues(DEFAULT_CUSTOMER_PLACEHOLDERS)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not load customer template'
        setError(msg)
        setHasCustomerTemplate(false)
        setCustomerValues(DEFAULT_CUSTOMER_PLACEHOLDERS)
      } finally {
        setLoadingTemplate(false)
      }
    }

    loadTemplate()
  }, [currentOrg])

  if (!template) {
    notFound()
  }

  const stateTemplate = template as TemplateDescriptor

  const generatedOn = formatDate(new Date())
  const placeholders = useMemo(
    () => ({ ...DEFAULT_CUSTOMER_PLACEHOLDERS, ...customerValues, state_name: stateTemplate.fullName, generated_date: generatedOn }),
    [customerValues, stateTemplate.fullName, generatedOn]
  )

  const apply = (text: string) => fillPlaceholders(text, placeholders)
  const pdfDoc = useMemo(() => <NoticeDocument template={stateTemplate} data={placeholders} generatedOn={generatedOn} />, [stateTemplate, placeholders, generatedOn])

  const mergedPlaintext = useMemo(() => {
    return stateTemplate.sections
      .map((section) => fillPlaceholders(section.content, placeholders))
      .filter(Boolean)
      .join('\n\n')
  }, [stateTemplate.sections, placeholders])

  const handleStartNotice = () => {
    const prefillPayload = {
      template: stateTemplate.slug,
      stateName: stateTemplate.fullName,
      mergedText: mergedPlaintext,
      placeholders,
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('notice_prefill', JSON.stringify(prefillPayload))
    }

    router.push(`/new-notice?template=${stateTemplate.slug}&prefill=true`)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">State template</p>
          <h1 className="text-3xl font-bold text-gray-900">{stateTemplate.fullName} — Preliminary Notice</h1>
          <p className="text-sm text-gray-600">Reference only; verify statutes and deadlines. Prefilled with your customer template.</p>
        </header>

        {!hasCustomerTemplate ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <span>Save your business info in settings to prefill every notice automatically.</span>
            <Link href="/settings" className="inline-flex items-center justify-center rounded-lg bg-yellow-600 px-3 py-2 font-semibold text-white transition hover:bg-yellow-700">
              Go to settings
            </Link>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Business name', value: placeholders.business_name },
            { label: 'Company', value: placeholders.company_name },
            { label: 'Email', value: placeholders.email },
            { label: 'Phone', value: placeholders.phone },
            { label: 'Address', value: placeholders.address },
            { label: 'Tax ID', value: placeholders.tax_id },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500">{item.label}</p>
              <p className="font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loadingTemplate ? <p className="text-sm text-gray-500">Loading customer template…</p> : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{stateTemplate.deadlineDays}-day window</p>
            <p className="text-sm text-gray-600">Certified mail {stateTemplate.certifiedMailRequired ? 'recommended' : 'optional'}; {stateTemplate.notaryRequired ? 'notary required' : 'notary not required'}.</p>
          </div>
          {ready ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <PDFViewer style={{ width: '100%', height: '520px', border: 'none' }}>{pdfDoc}</PDFViewer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">Loading preview…</div>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            {ready ? (
              <PDFDownloadLink document={pdfDoc} fileName={`${stateTemplate.slug}-preliminary-notice.pdf`} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700">
                {({ loading }) => (loading ? 'Preparing PDF…' : 'Download PDF')}
              </PDFDownloadLink>
            ) : null}
            <button
              type="button"
              onClick={handleStartNotice}
              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
            >
              Use This Template — Start New Notice
            </button>
            <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">Generated {generatedOn}</span>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Template text (prefilled)</h2>
          <div className="space-y-3 text-sm leading-relaxed text-gray-800">
            {stateTemplate.sections.map((section, idx) => {
              const text = apply(section.content)
              if (!text) return null
              switch (section.type) {
                case 'header':
                  return (
                    <div key={`preview-${idx}`} className="rounded-lg bg-gray-50 px-3 py-2 text-gray-800 whitespace-pre-line">
                      {text}
                    </div>
                  )
                case 'title': {
                  const [line1, ...rest] = text.split('\n')
                  return (
                    <div key={`preview-${idx}`} className="space-y-1 text-center">
                      <p className="text-base font-bold uppercase text-gray-900">{line1}</p>
                      {rest.length ? <p className="text-sm font-medium text-gray-700 whitespace-pre-line">{rest.join('\n')}</p> : null}
                    </div>
                  )
                }
                case 'warning':
                  return (
                    <div key={`preview-${idx}`} className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-900">
                      {text}
                    </div>
                  )
                case 'blank':
                  return (
                    <div key={`preview-${idx}`} className="rounded-lg bg-white px-3 py-2 text-gray-800">
                      <p className="text-xs font-semibold uppercase text-gray-500">Fill before sending</p>
                      <div className="whitespace-pre-line underline decoration-gray-400 decoration-1">{text}</div>
                    </div>
                  )
                case 'signature':
                  return (
                    <div key={`preview-${idx}`} className="rounded-lg bg-gray-50 px-3 py-2 text-gray-800">
                      <p className="text-xs font-semibold uppercase text-gray-500">Signature</p>
                      <p>{text}</p>
                    </div>
                  )
                default:
                  return (
                    <p key={`preview-${idx}`} className="text-sm text-gray-800 whitespace-pre-line">
                      {text}
                    </p>
                  )
              }
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Heads up</p>
          <p>Templates are informational, “as is,” and not legal advice. Confirm statute updates, project-type nuances, and local requirements before sending.</p>
        </section>

        <p className="text-xs text-gray-500">Generated on {generatedOn} • Not legal advice</p>
      </div>
    </div>
  )
}
