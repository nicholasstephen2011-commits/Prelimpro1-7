'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const stateNotices = [
    { state: 'Alaska', names: 'Notice of Right to Lien', note: 'Serve within 15 days on owner-occupied residential to keep rights.', statuteUrl: 'https://www.akleg.gov/basis/statutes.asp#34.35.064', templateHref: '/templates/alaska' },
    { state: 'Arizona', names: 'Preliminary Twenty Day Notice', note: 'Due within 20 days of first furnishing to preserve lien rights.', statuteUrl: 'https://www.azleg.gov/ars/33/00992-01.htm', templateHref: '/templates/arizona' },
    { state: 'Arkansas', names: 'Notice of Intent to Lien (subs)', note: 'Often required on residential single-family jobs before filing.', statuteUrl: 'https://law.justia.com/codes/arkansas/2024/title-18/subtitle-4/chapter-44/subchapter-1/section-18-44-115/', templateHref: '/templates/arkansas' },
    { state: 'California', names: 'Preliminary 20-Day Notice', note: 'Send within 20 days of first furnishing on most private jobs.', statuteUrl: 'https://law.justia.com/codes/california/2024/civ/title-2/division-4/part-6/chapter-2/article-1/8200/', templateHref: '/templates/california' },
    { state: 'Colorado', names: 'Statement of Lien Rights', note: 'Notice of intent must be sent 10 days before recording a lien.', statuteUrl: 'https://law.justia.com/codes/colorado/2023/title-38/article-22/section-38-22-109/', templateHref: '/templates/colorado' },
    { state: 'Connecticut', names: 'Preliminary Notice (limited)', note: 'Owner-occupied residential may require advance notice.', statuteUrl: 'https://www.cga.ct.gov/current/pub/chap_847.htm#sec_49-35', templateHref: '/templates/connecticut' },
    { state: 'Florida', names: 'Notice to Owner (NTO)', note: 'Serve within 45 days of first furnishing to protect lien rights.', statuteUrl: 'https://www.flsenate.gov/Laws/Statutes/2023/Chapter713/Part_I', templateHref: '/templates/florida' },
    { state: 'Georgia', names: 'Preliminary Notice of Lien', note: 'Also called Notice to Contractor; deadlines vary by tier.', statuteUrl: 'https://law.justia.com/codes/georgia/2023/title-44/chapter-14/article-8/part-3/section-44-14-361-3/', templateHref: '/templates/georgia' },
    { state: 'Idaho', names: 'Preliminary Notice', note: 'Send early to secure lien rights; timelines vary by role.', statuteUrl: 'https://law.justia.com/codes/idaho/2023/title-45/chapter-5/section-45-507/', templateHref: '/templates/idaho' },
    { state: 'Illinois', names: 'Notice of Furnishing', note: 'Subs/suppliers on owner-occupied residential must notice within 60 days.', statuteUrl: 'https://www.ilga.gov/legislation/ilcs/fulltext.asp?DocName=077000600K24', templateHref: '/templates/illinois' },
    { state: 'Indiana', names: 'Prelien Notice', note: 'Owner-occupied residential: subs within 30 days, suppliers within 60.', statuteUrl: 'https://iga.in.gov/laws/2023/ic/titles/032#32-28-3-1', templateHref: '/templates/indiana' },
    { state: 'Iowa', names: 'Preliminary Notice', note: 'Post to the MNLR system promptly after first furnishing.', statuteUrl: 'https://www.legis.iowa.gov/docs/code/572.13A.pdf', templateHref: '/templates/iowa' },
    { state: 'Kansas', names: 'Preliminary Notice (residential)', note: 'Primes on residential must warn owners before filing lien.', statuteUrl: 'https://www.ksrevisor.org/statutes/chapters/ch60/060_011_0003b.html', templateHref: '/templates/kansas' },
    { state: 'Kentucky', names: 'Notice of Right to Lien', note: 'For owner-occupied 1-2 family dwellings, notice is required.', statuteUrl: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=51465', templateHref: '/templates/kentucky' },
    { state: 'Louisiana', names: 'Notice of Lien Rights / Preliminary Notice', note: 'Strict and role-specific; send early, especially residential.', statuteUrl: 'https://legis.la.gov/Legis/Law.aspx?d=106257', templateHref: '/templates/louisiana' },
    { state: 'Maryland', names: 'Preliminary Notice (subs)', note: 'Subs must give notice within 120 days of last work.', statuteUrl: 'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gpr&section=9-104', templateHref: '/templates/maryland' },
    { state: 'Michigan', names: 'Notice of Furnishing', note: 'Serve within 30 days of first furnishing on most jobs.', statuteUrl: 'https://www.legislature.mi.gov/(S(0))/mileg.aspx?page=getobject&objectname=mcl-570-1109', templateHref: '/templates/michigan' },
    { state: 'Minnesota', names: 'Prelien Notice', note: 'Statutory language required; deliver with contract or first invoice.', statuteUrl: 'https://www.revisor.mn.gov/statutes/cite/514.011', templateHref: '/templates/minnesota' },
    { state: 'Mississippi', names: 'Notice to Owner', note: 'Residential primes must give written notice before filing lien.', statuteUrl: 'https://law.justia.com/codes/mississippi/2023/title-85/chapter-7/section-85-7-433/', templateHref: '/templates/mississippi' },
    { state: 'Missouri', names: 'Notice of Intent to Lien', note: 'Serve at least 10 days before recording a lien claim.', statuteUrl: 'https://revisor.mo.gov/main/OneSection.aspx?section=429.100', templateHref: '/templates/missouri' },
    { state: 'Montana', names: 'Construction Lien Notice (residential)', note: 'Pre-lien notice to homeowner is needed to preserve rights.', statuteUrl: 'https://leg.mt.gov/bills/mca/title_0710/chapter_0030/part_0050/section_0310/0710-0030-0050-0310.html', templateHref: '/templates/montana' },
    { state: 'Nebraska', names: 'Notice of Right to Lien (residential)', note: 'Certain residential projects require advance notice.', statuteUrl: 'https://nebraskalegislature.gov/laws/statutes.php?statute=52-145', templateHref: '/templates/nebraska' },
    { state: 'Nevada', names: 'Notice of Right to Lien', note: 'Due within 31 days of first furnishing to retain lien rights.', statuteUrl: 'https://www.leg.state.nv.us/NRS/NRS-108.html#NRS108Sec245', templateHref: '/templates/nevada' },
    { state: 'New Hampshire', names: 'Notice of Right to Lien', note: 'Recommended/required on many private projects to secure rights.', statuteUrl: 'https://www.gencourt.state.nh.us/rsa/html/XXXVI/447/447-5.htm', templateHref: '/templates/new-hampshire' },
    { state: 'New Jersey', names: 'Notice of Unpaid Balance (residential)', note: 'NUB and arbitration demand precede residential liens.', statuteUrl: 'https://www.njleg.state.nj.us/tn/2022/NJSA_2A_44A-21.pdf', templateHref: '/templates/new-jersey' },
    { state: 'New Mexico', names: 'Preliminary Notice', note: 'Generally due within 60 days of first furnishing.', statuteUrl: 'https://law.justia.com/codes/new-mexico/2023/chapter-48/article-2/section-48-2-2-1/', templateHref: '/templates/new-mexico' },
    { state: 'North Carolina', names: 'Notice to Lien Agent', note: 'File early for most projects (except some small residential).', statuteUrl: 'https://www.ncleg.gov/EnactedLegislation/Statutes/PDF/BySection/Chapter_44A/GS_44A-11.1.pdf', templateHref: '/templates/north-carolina' },
    { state: 'North Dakota', names: 'Preliminary Notice', note: 'Residential projects require notice to owner early.', statuteUrl: 'https://www.ndlegis.gov/cencode/t35c27.pdf', templateHref: '/templates/north-dakota' },
    { state: 'Ohio', names: 'Notice of Furnishing', note: 'Serve within 21 days of first furnishing on NOC projects.', statuteUrl: 'https://codes.ohio.gov/ohio-revised-code/section-1311.05', templateHref: '/templates/ohio' },
    { state: 'Oregon', names: 'Information Notice to Owner', note: 'Subs/suppliers usually due within 8 days of first furnishing.', statuteUrl: 'https://www.oregonlegislature.gov/bills_laws/ors/ors087.html', templateHref: '/templates/oregon' },
    { state: 'Pennsylvania', names: 'Notice of Furnishing', note: 'Required on directory-listed projects within 45 days.', statuteUrl: 'https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/49/00.015..HTM', templateHref: '/templates/pennsylvania' },
    { state: 'South Carolina', names: 'Notice of Furnishing', note: 'Send after a Notice of Project Commencement is filed.', statuteUrl: 'https://www.scstatehouse.gov/code/t29c005.php', templateHref: '/templates/south-carolina' },
    { state: 'South Dakota', names: 'Preliminary Notice', note: 'Residential requires notice to owner within 10 days.', statuteUrl: 'https://sdlegislature.gov/Statutes/Codified_Laws/44-9-53', templateHref: '/templates/south-dakota' },
    { state: 'Tennessee', names: 'Notice of Nonpayment / Notice to Owner', note: 'Strict timelines vary by role and project type.', statuteUrl: 'https://law.justia.com/codes/tennessee/2023/title-66/chapter-11/part-1/section-66-11-145/', templateHref: '/templates/tennessee' },
    { state: 'Texas', names: 'Pre-Lien Notice', note: 'Monthly notices due by the 15th for prior month work.', statuteUrl: 'https://statutes.capitol.texas.gov/Docs/PR/htm/PR.53.htm#53.056', templateHref: '/templates/texas' },
    { state: 'Utah', names: 'Preliminary Notice (registry)', note: 'File in the SCR within 20 days of first furnishing.', statuteUrl: 'https://le.utah.gov/xcode/Title38/Chapter1A/38-1a-S501.html', templateHref: '/templates/utah' },
    { state: 'Washington', names: 'Notice to Owner / Construction Lien Notice', note: 'Commercial within 60 days; many residential within 10 days.', statuteUrl: 'https://app.leg.wa.gov/rcw/default.aspx?cite=60.04.031', templateHref: '/templates/washington' },
    { state: 'Wisconsin', names: 'Notice of Lien Rights', note: 'Primes must serve within 10 days of first work on many private jobs.', statuteUrl: 'https://docs.legis.wisconsin.gov/statutes/statutes/779/02', templateHref: '/templates/wisconsin' },
    { state: 'Wyoming', names: 'Preliminary Notice', note: 'Serve to owner/GC to secure lien rights before filing.', statuteUrl: 'https://law.justia.com/codes/wyoming/2023/title-29/chapter-1/section-29-1-312/', templateHref: '/templates/wyoming' },
  ];

type AuthStatus = 'unknown' | 'signed-in' | 'signed-out'

export default function Home() {
  const router = useRouter()
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unknown')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setAuthStatus(data?.session ? 'signed-in' : 'signed-out')
      } catch {
        setAuthStatus('signed-out')
      }
    }
    check()
  }, [])

  const requireAuth = useCallback(
    async (href: string) => {
      if (authStatus === 'signed-in') {
        router.push(href)
        return
      }
      // If we do not yet know, re-check to be safe
      if (authStatus === 'unknown') {
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          setAuthStatus('signed-in')
          router.push(href)
          return
        }
      }
      setToast('Sign in required to continue')
      setTimeout(() => setToast(null), 3200)
      router.push(`/auth?redirect=${encodeURIComponent(href)}&error=auth_required`)
    },
    [authStatus, router]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="pointer-events-auto rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg ring-1 ring-amber-200">
            {toast}
          </div>
        </div>
      ) : null}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Notices Contract</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">Protect lien rights with clear preliminary notices</h1>
          <p className="mt-4 text-lg text-gray-600">
            Simple, state-specific guidance and templates to get notices out on time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <button
              onClick={() => requireAuth('/settings')}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-1 hover:bg-gray-50 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Settings
            </button>
            <button
              onClick={() => requireAuth('/dashboard')}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get Started
            </button>
            <button
              onClick={() => requireAuth('/upgrade')}
              className="inline-flex items-center justify-center rounded-lg border border-blue-600 px-6 py-3 text-sm font-semibold text-blue-700 bg-white shadow-sm transition hover:-translate-y-1 hover:bg-blue-50 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Subscribe / Pricing
            </button>
          </div>
        </section>

        <section className="mt-16">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Preliminary notices by state (names, requirements, templates)
            </h2>
            <p className="mt-3 text-gray-600">
              Verify current deadlines before sending—rules change often and vary by project type.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-6xl">
            <div className="overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">State</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Common name(s)</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Brief note</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Template</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {stateNotices.map((item) => (
                      <tr key={item.state} className="cursor-pointer transition hover:bg-gray-50 hover:shadow-md">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          <Link href={item.statuteUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                            {item.state}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{item.names}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.note}</td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          <Link
                            href={item.templateHref || '#'}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            View template
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
