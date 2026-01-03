"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"
import { useCurrentRole, useOrg } from "../../contexts/OrgContext"

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unexpected error")

interface CustomerTemplateForm {
  businessName: string
  companyName: string
  address: string
  phone: string
  email: string
  taxId: string
  website: string
}

const EMPTY_TEMPLATE: CustomerTemplateForm = {
  businessName: "",
  companyName: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  website: "",
}

interface MemberRow {
  id: string
  invited_email?: string | null
  user_id?: string | null
  role: string
  status: string
  created_at?: string
}

interface NoticeRow {
  id: string
  title?: string | null
  amount?: number | null
  status?: string | null
  created_at?: string | null
}

interface InviteRow {
  id: string
  code: string
  email: string
  role: string
  status: string
  expires_at?: string | null
  created_at?: string | null
}

interface UserTemplateForm {
  fullName: string
  company: string
  phone: string
  email: string
  address: string
  website: string
  logoUrl: string
}

const EMPTY_USER_TEMPLATE: UserTemplateForm = {
  fullName: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  logoUrl: "",
}

export default function SettingsPage() {
  const { currentOrg, loading: loadingOrg, createOrg, refresh: refreshOrgs } = useOrg()
  const { isAdmin, roleLoading } = useCurrentRole()
  const [form, setForm] = useState<CustomerTemplateForm>(EMPTY_TEMPLATE)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [avatarSeed, setAvatarSeed] = useState<string>("me")
  const [userTemplate, setUserTemplate] = useState<UserTemplateForm>(EMPTY_USER_TEMPLATE)
  const [userTemplateId, setUserTemplateId] = useState<string | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userSaving, setUserSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedOnce = useRef(false)

  const titleOrg = useMemo(() => currentOrg?.org_name || "Organization", [currentOrg])

  const loadTemplate = useCallback(async () => {
    if (!currentOrg) return
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("customer_templates")
        .select("*")
        .eq("org_id", currentOrg.org_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError

      if (data) {
        setTemplateId(data.id)
        setForm({
          businessName: data.business_name || "",
          companyName: data.company_name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          taxId: data.tax_id || "",
          website: data.website || "",
        })
      } else {
        setTemplateId(null)
        setForm(EMPTY_TEMPLATE)
      }
      hasLoadedOnce.current = true
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load template")
    }
  }, [currentOrg])

  const loadMembers = useCallback(async () => {
    if (!currentOrg) return
    try {
      const { data, error: fetchError } = await supabase
        .from("organization_members")
        .select("id, user_id, invited_email, role, status, created_at")
        .eq("org_id", currentOrg.org_id)
        .order("created_at", { ascending: true })

      if (fetchError) throw fetchError
      setMembers(data || [])
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load members")
    }
  }, [currentOrg])
  const persistTemplate = useCallback(
    async (reason: "auto" | "manual") => {
      if (!currentOrg) return
      setSaving(true)
      setError(null)
      try {
        const payload = {
          id: templateId || undefined,
          org_id: currentOrg.org_id,
          business_name: form.businessName || null,
          company_name: form.companyName || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          tax_id: form.taxId || null,
          website: form.website || null,
        }

        const { data, error: upsertError } = await supabase
          .from("customer_templates")
          .upsert(payload, { onConflict: "id" })
          .select("id, updated_at")
          .single()

        if (upsertError) throw upsertError
        setTemplateId(data.id)
        setAutoSavedAt(new Date().toLocaleTimeString())
        if (reason === "manual") {
          // No toast; flash handled by autoSavedAt
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Unable to save template")
      } finally {
        setSaving(false)
      }
    },
    [currentOrg, form, templateId]
  )

  const scheduleAutoSave = useCallback(
    (nextForm: CustomerTemplateForm) => {
      if (!hasLoadedOnce.current || !currentOrg) return
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        setForm(nextForm)
        persistTemplate("auto")
      }, 800)
    },
    [currentOrg, persistTemplate]
  )

  const handleChange = (key: keyof CustomerTemplateForm, value: string) => {
    const next = { ...form, [key]: value }
    setForm(next)
    scheduleAutoSave(next)
  }

  const handleDelete = async () => {
    if (!currentOrg || !templateId) return
    setSaving(true)
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from("customer_templates")
        .delete()
        .eq("id", templateId)
        .eq("org_id", currentOrg.org_id)

      if (deleteError) throw deleteError
      setTemplateId(null)
      setForm(EMPTY_TEMPLATE)
      setAutoSavedAt(null)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to delete template")
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return
    setError(null)
    setInviteStatus(null)
    try {
      const code = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const payload = {
        code,
        org_id: currentOrg.org_id,
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "pending",
      }
      const { error: inviteError } = await supabase.from("org_invites").insert(payload)
      if (inviteError) throw inviteError
      setInviteEmail("")
      setInviteStatus("Invite created. Share the link below.")
      await loadInvites()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to send invite")
    }
  }

  const handleGeolocate = async () => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setError("Geolocation not available in this browser")
      return
    }
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          const res = await fetch(url, { headers: { "Accept-Language": "en" } })
          const json = await res.json()
          const addr = json?.display_name as string
          if (addr) {
            handleChange("address", addr)
          }
        } catch (err: unknown) {
          setError(getErrorMessage(err) || "Could not resolve address")
        }
      },
      (geoError) => {
        setError(geoError?.message || "Location permission denied")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCreateOrg = async () => {
    await createOrg()
    await refreshOrgs()
  }

  const savedFlash = autoSavedAt ? `Saved at ${autoSavedAt}` : ""

  const loadNotices = useCallback(async () => {
    if (!currentOrg) return
    try {
      const { data, error: noticeError } = await supabase
        .from("notices")
        .select("id, title, amount, status, created_at")
        .eq("org_id", currentOrg.org_id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (noticeError) throw noticeError
      setNotices(data || [])
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load notices")
    }
  }, [currentOrg])

  const loadUserTemplate = useCallback(async () => {
    setUserLoading(true)
    setError(null)
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      const userId = userData.user?.id
      if (!userId) throw new Error("Sign in to load your template")

      const { data, error: fetchError } = await supabase
        .from("user_notice_templates")
        .select("id, full_name, company, phone, email, address, website, logo_url")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError

      if (data) {
        setUserTemplateId(data.id)
        setUserTemplate({
          fullName: data.full_name || "",
          company: data.company || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          website: data.website || "",
          logoUrl: data.logo_url || "",
        })
      } else {
        setUserTemplateId(null)
        setUserTemplate(EMPTY_USER_TEMPLATE)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load your template")
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserTemplate()
  }, [loadUserTemplate])

  const saveUserTemplate = useCallback(async () => {
    setUserSaving(true)
    setError(null)
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      const userId = userData.user?.id
      if (!userId) throw new Error("Sign in to save your template")

      const payload = {
        id: userTemplateId || undefined,
        user_id: userId,
        full_name: userTemplate.fullName || null,
        company: userTemplate.company || null,
        phone: userTemplate.phone || null,
        email: userTemplate.email || null,
        address: userTemplate.address || null,
        website: userTemplate.website || null,
        logo_url: userTemplate.logoUrl || null,
      }

      const { data, error: upsertError } = await supabase
        .from("user_notice_templates")
        .upsert(payload, { onConflict: "id" })
        .select("id")
        .single()

      if (upsertError) throw upsertError
      setUserTemplateId(data.id)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to save your template")
    } finally {
      setUserSaving(false)
    }
  }, [userTemplate, userTemplateId])

  const handleLogoUpload = async (file: File) => {
    try {
      setLogoUploading(true)
      setError(null)
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      const userId = userData.user?.id
      if (!userId) throw new Error("Sign in to upload a logo")

      const path = `logos/${userId}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage.from("logos").getPublicUrl(path)
      const url = publicUrl?.publicUrl
      if (url) {
        setUserTemplate((prev) => ({ ...prev, logoUrl: url }))
        await saveUserTemplate()
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Logo upload failed")
    } finally {
      setLogoUploading(false)
    }
  }

  const loadInvites = useCallback(async () => {
    if (!currentOrg) return
    try {
      const { data, error: inviteErr } = await supabase
        .from("org_invites")
        .select("id, code, email, role, status, expires_at, created_at")
        .eq("org_id", currentOrg.org_id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (inviteErr) throw inviteErr
      setInvites(data || [])
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load invites")
    }
  }, [currentOrg])

  const revokeInvite = async (id: string) => {
    try {
      const { error: revokeErr } = await supabase
        .from("org_invites")
        .update({ status: "revoked" })
        .eq("id", id)

      if (revokeErr) throw revokeErr
      await loadInvites()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to revoke invite")
    }
  }

  useEffect(() => {
    if (!currentOrg) return
    loadTemplate()
    loadMembers()
    loadNotices()
    loadInvites()
  }, [currentOrg, loadTemplate, loadMembers, loadNotices, loadInvites])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl bg-white px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Settings</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{titleOrg}</h1>
            <p className="text-sm text-gray-600">Manage org members and your default customer info used on notices.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Templates
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        ) : null}

        {(loadingOrg || roleLoading) && (
          <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-gray-700 shadow-sm">Checking permissions...</div>
        )}

        {!loadingOrg && !currentOrg ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No organization yet</h2>
            <p className="text-sm text-gray-600">Create your workspace to start saving notices.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCreateOrg}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create organization
              </button>
              <button
                onClick={refreshOrgs}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          </section>
        ) : null}

        {currentOrg ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profile & avatar</h2>
                  <p className="text-sm text-gray-600">Personalize your account; this stays with you across orgs.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 shadow-sm">
                    <Image
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed || "me")}`}
                      alt="Avatar"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={() => setAvatarSeed(`${Date.now()}`)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Regenerate
                    </button>
                    <a
                      href={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed || "me")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Open avatar image
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Full name" value={userTemplate.fullName} onChange={(v) => setUserTemplate({ ...userTemplate, fullName: v })} />
                <InputField label="Company" value={userTemplate.company} onChange={(v) => setUserTemplate({ ...userTemplate, company: v })} />
                <InputField label="Phone" value={userTemplate.phone} onChange={(v) => setUserTemplate({ ...userTemplate, phone: v })} />
                <InputField label="Email" value={userTemplate.email} onChange={(v) => setUserTemplate({ ...userTemplate, email: v })} type="email" />
                <div className="md:col-span-2">
                  <InputField label="Address" value={userTemplate.address} onChange={(v) => setUserTemplate({ ...userTemplate, address: v })} />
                </div>
                <InputField label="Website" value={userTemplate.website} onChange={(v) => setUserTemplate({ ...userTemplate, website: v })} />
                <div className="flex flex-col gap-2 text-sm text-gray-700">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Company logo</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded border border-gray-200 bg-gray-50">
                      {userTemplate.logoUrl ? (
                        <Image src={userTemplate.logoUrl} alt="Logo" width={64} height={64} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No logo</div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                      }}
                      className="text-xs"
                    />
                    {logoUploading ? <span className="text-xs text-gray-600">Uploading…</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveUserTemplate}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                  disabled={userSaving || userLoading}
                >
                  {userSaving ? "Saving…" : "Save personal template"}
                </button>
                <button
                  type="button"
                  onClick={loadUserTemplate}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Customer information template</h2>
                  <p className="text-sm text-gray-600">Auto-fills every new notice; edits auto-save for this org.</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-gray-600">
                  {saving ? <span>Saving…</span> : null}
                  {savedFlash ? <span className="text-green-700">{savedFlash}</span> : null}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InputField label="Business name" value={form.businessName} onChange={(v) => handleChange("businessName", v)} required />
                <InputField label="Company name" value={form.companyName} onChange={(v) => handleChange("companyName", v)} />
                <div className="md:col-span-2">
                  <InputField label="Address" value={form.address} onChange={(v) => handleChange("address", v)} required />
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleGeolocate}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Use GPS + reverse lookup
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, address: "" }))}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <InputField label="Phone" value={form.phone} onChange={(v) => handleChange("phone", v)} />
                <InputField label="Email" value={form.email} onChange={(v) => handleChange("email", v)} type="email" />
                <InputField label="Tax ID" value={form.taxId} onChange={(v) => handleChange("taxId", v)} />
                <InputField label="Website" value={form.website} onChange={(v) => handleChange("website", v)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => persistTemplate("manual")}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save now"}
                </button>
                <button
                  type="button"
                  onClick={loadTemplate}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  disabled={!templateId}
                >
                  Delete
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent notices</h2>
                  <p className="text-sm text-gray-600">Last few notices in this org (drafts and sent).</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                {notices.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-600">No notices yet.</p>
                ) : (
                  notices.map((n) => (
                    <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{n.title || "Untitled notice"}</p>
                        <p className="text-gray-600">{n.status || "draft"}</p>
                        <p className="text-gray-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</p>
                      </div>
                      <div className="text-right text-gray-800">
                        {typeof n.amount === "number" ? `$${n.amount.toFixed(2)}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {isAdmin ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Members</h2>
                    <p className="text-sm text-gray-600">Invite teammates; billing stays on the org.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <InputField label="Invite email" value={inviteEmail} onChange={setInviteEmail} placeholder="teammate@example.com" />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Send invite
                  </button>
                </div>

                <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                  {members.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-600">No members yet.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">{m.invited_email || m.user_id || "Member"}</p>
                          <p className="text-gray-600">{m.status}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{m.role}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {isAdmin ? (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Pending invites</h2>
                    <p className="text-sm text-gray-600">Share the accept link; revoke to cancel.</p>
                  </div>
                  {inviteStatus ? <p className="text-sm font-semibold text-green-700">{inviteStatus}</p> : null}
                </div>

                <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                  {invites.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-600">No invites yet.</p>
                  ) : (
                    invites.map((inv) => {
                      const acceptUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.code}`
                      return (
                        <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                          <div className="min-w-[200px]">
                            <p className="font-semibold text-gray-900">{inv.email}</p>
                            <p className="text-gray-600">{inv.role}</p>
                            <p className="text-gray-500">{inv.status}</p>
                            {inv.expires_at ? <p className="text-gray-500">Expires {new Date(inv.expires_at).toLocaleString()}</p> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(acceptUrl)}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                            >
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={() => revokeInvite(inv.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              disabled={inv.status !== "pending"}
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
        {label}
        {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}
