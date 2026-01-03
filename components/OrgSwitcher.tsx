"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOrg } from "../contexts/OrgContext"

export default function OrgSwitcher() {
  const router = useRouter()
  const { orgs, currentOrg, selectOrg, refresh } = useOrg()
  const [open, setOpen] = useState(false)

  if (!orgs || orgs.length <= 1) return null

  const handleSelect = async (orgId: string) => {
    selectOrg(orgId)
    await refresh()
    setOpen(false)
    router.push("/dashboard")
  }

  return (
    <div className="fixed right-4 top-16 z-40">
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {currentOrg?.org_name || "Select org"}
          <span className="text-gray-500">▾</span>
        </button>
        {open ? (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="max-h-64 overflow-y-auto py-2">
              {orgs.map((org) => (
                <button
                  key={org.org_id}
                  onClick={() => handleSelect(org.org_id)}
                  className="flex w-full items-center justify-between px-4 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">{org.org_name || "Untitled org"}</span>
                  {currentOrg?.org_id === org.org_id ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Current</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
