"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"

interface InviteView {
  id: string
  org_id: string
  email: string
  role: string
  status: string
  expires_at: string | null
}

export default function InviteAcceptPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [invite, setInvite] = useState<InviteView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const email = sessionData.session?.user?.email
        if (!email) {
          router.replace("/auth")
          return
        }

        const { data, error: fetchErr } = await supabase
          .from("org_invites")
          .select("id, org_id, email, role, status, expires_at")
          .eq("code", params.code)
          .maybeSingle()

        if (fetchErr) throw fetchErr
        if (!data) throw new Error("Invite not found")
        if (data.email !== email) throw new Error("This invite is for a different email")
        if (data.status !== "pending") throw new Error("Invite is not active")
        if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("Invite expired")

        setInvite(data)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unable to load invite"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.code, router])

  const accept = async () => {
    if (!invite) return
    setAccepting(true)
    setError(null)
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw sessionErr
      const userId = sessionData.session?.user?.id
      const email = sessionData.session?.user?.email
      if (!userId || !email) throw new Error("Sign in to accept the invite")

      const { error: insertErr } = await supabase.from("organization_members").insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role,
        status: "active",
      })
      if (insertErr) throw insertErr

      await supabase
        .from("org_invites")
        .update({ status: "accepted", redeemed_by: userId, redeemed_at: new Date().toISOString() })
        .eq("id", invite.id)

      router.push("/dashboard")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invite"
      setError(msg)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
          <p className="text-sm font-semibold text-gray-600">Checking your invite...</p>
        </div>
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-sm font-semibold text-red-600">{error || "Invite not found"}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/auth" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
              Sign in
            </Link>
            <Link href="/" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Accept invite</h1>
        <p className="text-sm text-gray-700">Org: {invite.org_id}</p>
        <p className="text-sm text-gray-700">Role: {invite.role}</p>
        <p className="text-sm text-gray-500">Email: {invite.email}</p>
        {invite.expires_at ? <p className="text-xs text-gray-500">Expires {new Date(invite.expires_at).toLocaleString()}</p> : null}
        <div className="flex gap-3">
          <button
            onClick={accept}
            disabled={accepting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {accepting ? "Joining…" : "Accept"}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
