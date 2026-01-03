import Link from 'next/link'
import {
  BoltIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EnvelopeOpenIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/solid'
import { STATE_TEMPLATE_LIST } from '../../constants/stateTemplates'

const icons = [BoltIcon, ShieldCheckIcon, ExclamationTriangleIcon, EnvelopeOpenIcon, ClipboardDocumentCheckIcon, DocumentArrowUpIcon]

export default function TemplatesIndex() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Templates</p>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Choose a State Template</h1>
          <p className="text-gray-600">Jump into a state-specific preliminary notice and download it as a PDF.</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {STATE_TEMPLATE_LIST.map((tpl, idx) => {
            const Icon = icons[idx % icons.length]
            return (
              <div
                key={tpl.slug}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="flex-1 space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">{tpl.fullName}</h2>
                    <p className="text-sm font-medium text-gray-700">Preliminary notice template</p>
                    <p className="text-sm text-gray-600">{tpl.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-xs font-medium text-gray-600">
                  <span>{tpl.deadlineDays}-day deadline</span>
                  <span>{tpl.certifiedMailRequired ? 'Certified mail' : 'Mail/personal delivery'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  <Link
                    href={`/templates/${tpl.slug}`}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Generate PDF
                  </Link>
                  <Link
                    href={`/new-notice?template=${tpl.slug}`}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
                  >
                    Start notice
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
