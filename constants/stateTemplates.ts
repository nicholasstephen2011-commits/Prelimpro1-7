import { DEFAULT_NOTICE_TEMPLATE, STATE_NOTICE_TEMPLATES, StateNoticeTemplate } from '../templates/notices/stateNoticeTemplates'

export type SectionType = 'header' | 'title' | 'warning' | 'body' | 'blank' | 'signature'

export interface StateSection {
  type: SectionType
  content: string
}

export interface StateTemplateDescriptor {
  fullName: string
  slug: string
  description: string
  deadlineDays: number
  certifiedMailRequired: boolean
  notaryRequired: boolean
  sections: StateSection[]
}

export interface CustomerPlaceholderMap {
  business_name: string
  company_name: string
  address: string
  phone: string
  email: string
  tax_id: string
  website: string
  project_address?: string
  owner_name?: string
  amount_owed?: string
  service_dates?: string
  deadline_date?: string
  project_description?: string
  state_name?: string
  generated_date?: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toSections(state: string, tpl: StateNoticeTemplate): StateSection[] {
  const deliveryLine = `Deadline: ${tpl.deadlineDays} days • ${tpl.certifiedMailRequired ? 'Certified mail recommended' : 'Mail or personal delivery allowed'}${
    tpl.notaryRequired ? ' • Notary required' : ''
  }`

  const header = '{{business_name}}\n{{company_name}}\n{{address}}\n{{phone}} | {{email}}'
  const projectBlock = 'Project: {{project_address}}\nOwner: {{owner_name}}\nAmount owed: {{amount_owed}}\nServices: {{service_dates}}\nDeadline: {{deadline_date}}\nDescription: {{project_description}}'

  return [
    { type: 'header', content: header },
    { type: 'title', content: `${tpl.title}\n${tpl.subtitle}` },
    { type: 'warning', content: tpl.warningText },
    { type: 'body', content: `${tpl.legalNotice}\n\n${deliveryLine}` },
    ...tpl.additionalClauses.map((c): StateSection => ({ type: 'body', content: c })),
    { type: 'blank' as const, content: projectBlock },
    { type: 'signature' as const, content: `Signature: ____________________   Date: ________\n${tpl.signatureRequirements}\nState: ${state}` },
  ]
}

function toDescriptor(state: string, template: StateNoticeTemplate): StateTemplateDescriptor {
  return {
    fullName: state,
    slug: slugify(state),
    description: `${template.deadlineDays}-day window • ${template.certifiedMailRequired ? 'Certified mail' : 'Mail/personal delivery'}`,
    deadlineDays: template.deadlineDays,
    certifiedMailRequired: template.certifiedMailRequired,
    notaryRequired: template.notaryRequired,
    sections: toSections(state, template),
  }
}

const baseTemplates: StateTemplateDescriptor[] = Object.entries(STATE_NOTICE_TEMPLATES)
  .map(([state, template]) => toDescriptor(state, template))
  .sort((a, b) => a.fullName.localeCompare(b.fullName))

const defaultDescriptor = toDescriptor('Generic', DEFAULT_NOTICE_TEMPLATE)

export const STATE_TEMPLATE_LIST: StateTemplateDescriptor[] = [...baseTemplates, defaultDescriptor]

export function getStateTemplateBySlug(slug: string): StateTemplateDescriptor | null {
  const normalized = slug.toLowerCase()
  const found = STATE_TEMPLATE_LIST.find((tpl) => tpl.slug === normalized)
  if (found) return found
  if (!normalized) return null
  return {
    ...defaultDescriptor,
    fullName: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: normalized,
  }
}

export const DEFAULT_CUSTOMER_PLACEHOLDERS: CustomerPlaceholderMap = {
  business_name: 'Your Business Name',
  company_name: 'Your Company',
  address: '123 Project Address, City, ST 00000',
  phone: '(555) 123-4567',
  email: 'team@example.com',
  tax_id: 'XX-XXXXXXX',
  website: 'www.example.com',
  project_address: '123 Project Address, City, ST 00000',
  owner_name: 'Owner Name',
  amount_owed: '$0.00',
  service_dates: 'MM/DD/YYYY - MM/DD/YYYY',
  deadline_date: 'MM/DD/YYYY',
  project_description: 'Brief work description',
}

export function fillPlaceholders(text: string, values: CustomerPlaceholderMap): string {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const replacement = (values as Record<keyof CustomerPlaceholderMap, string | undefined>)[key as keyof CustomerPlaceholderMap]
    if (replacement && replacement.trim()) return replacement
    return '____________________'
  })
}
