"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

export default function SiteNavFooter() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogout = async () => {
    try {
      setLoading(true)
      setError("")
      await supabase.auth.signOut()
      router.replace("/auth")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Logout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="border-t border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-50" href="/">
            Home
          </Link>
          <Link className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-50" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-50" href="/settings">
            Settings
          </Link>
          <Link className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-50" href="/upgrade">
            Pricing & Subscriptions
          </Link>
          <Link className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-50" href="/auth">
            Sign In / Up
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-blue-700 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-blue-700 hover:underline">Terms of Service</Link>
          </div>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-3 py-2 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-500"
          >
            {loading ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>
      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      <div className="border-t border-gray-100 bg-white/60 px-4 py-2 text-center text-xs text-gray-500">
        Tool only • Not legal advice • Consult an attorney.
      </div>
    </footer>
  )
}
