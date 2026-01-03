"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unexpected error")

export type OrgRole = "admin" | "member"

export interface OrgMembership {
  id: string
  org_id: string
  org_name?: string
  slug?: string | null
  stripe_customer_id?: string | null
  role: OrgRole
  status: string
  created_at?: string
}

interface OrgContextValue {
  orgs: OrgMembership[]
  currentOrg: OrgMembership | null
  currentRole: OrgRole | null
  loading: boolean
  roleLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  selectOrg: (orgId: string) => void
  createOrg: (name?: string) => Promise<OrgMembership | null>
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

const STORAGE_KEY = "notices_current_org_id"

type MembershipRow = {
  id: string
  org_id: string
  org_name?: string
  slug?: string | null
  stripe_customer_id?: string | null
  role: OrgRole | string
  status: string
  created_at?: string
}

type CreatedOrgRow = {
  id: string
  name: string
  slug?: string | null
  stripe_customer_id?: string | null
  created_at?: string
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [currentOrg, setCurrentOrg] = useState<OrgMembership | null>(null)
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const bootstrapped = useRef(false)

  const persistSelection = useCallback((orgId: string | null) => {
    if (typeof window === "undefined") return
    if (!orgId) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, orgId)
  }, [])

  const selectOrg = useCallback(
    (orgId: string) => {
      const found = orgs.find((o) => o.org_id === orgId)
      if (found) {
        setCurrentOrg(found)
        setCurrentRole(found.role || null)
        persistSelection(orgId)
      }
    },
    [orgs, persistSelection]
  )

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(STORAGE_KEY)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [{ data: sessionData }, membershipsRes] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from("my_memberships").select("*"),
      ])

      if (membershipsRes.error) throw membershipsRes.error

      const memberships: OrgMembership[] = (membershipsRes.data || []).map((row: MembershipRow) => ({
        id: row.id,
        org_id: row.org_id,
        org_name: row.org_name,
        slug: row.slug,
        stripe_customer_id: row.stripe_customer_id,
        role: row.role as OrgRole,
        status: row.status,
        created_at: row.created_at,
      }))

      // Also fetch orgs created by the user in case they exist without membership yet
      const userId = sessionData.session?.user?.id
      setCurrentUserId(userId || null)
      let createdOrgs: OrgMembership[] = []
      if (userId) {
        const createdRes = await supabase
          .from("organizations")
          .select("id, name, slug, stripe_customer_id, created_at")
          .eq("created_by", userId)

        if (createdRes.error && createdRes.error.code !== "PGRST116") {
          throw createdRes.error
        }

        createdOrgs = (createdRes.data || []).map((org: CreatedOrgRow) => ({
          id: org.id,
          org_id: org.id,
          org_name: org.name,
          slug: org.slug,
          stripe_customer_id: org.stripe_customer_id,
          role: "admin" as OrgRole,
          status: "active",
          created_at: org.created_at,
        }))
      }

      const merged = mergeMemberships(memberships, createdOrgs)
      setOrgs(merged)

      const stored = loadFromStorage()
      const next = merged.find((m) => m.org_id === stored) || merged[0] || null
      setCurrentOrg(next || null)
      setCurrentRole(next?.role || null)
      if (next) persistSelection(next.org_id)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to load organizations")
    } finally {
      setLoading(false)
    }
  }, [loadFromStorage, persistSelection])

  const createOrg = useCallback(async (name?: string): Promise<OrgMembership | null> => {
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      const email = sessionData.session?.user?.email
      if (!userId) {
        throw new Error("Sign in to create an organization")
      }

      const orgName = name?.trim() || `${email || "workspace"} org`
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, created_by: userId })
        .select("id, name, slug, stripe_customer_id, created_at")
        .single()

      if (orgError) throw orgError

      // Add creator as admin member (policy allows creator)
      const memberPayload = {
        org_id: org.id,
        user_id: userId,
        role: "admin" as OrgRole,
        status: "active",
      }
      const { error: memberError } = await supabase.from("organization_members").insert(memberPayload)
      if (memberError && memberError.code !== "23505") {
        throw memberError
      }

      const membership: OrgMembership = {
        id: org.id,
        org_id: org.id,
        org_name: org.name,
        slug: org.slug,
        stripe_customer_id: org.stripe_customer_id,
        role: "admin",
        status: "active",
        created_at: org.created_at,
      }

      setOrgs((prev) => mergeMemberships(prev, [membership]))
      setCurrentOrg(membership)
      persistSelection(membership.org_id)
      return membership
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to create organization")
      return null
    }
  }, [persistSelection])

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    refresh()
  }, [refresh])

  useEffect(() => {
    const loadRole = async () => {
      if (!currentOrg || !currentUserId) {
        setCurrentRole(null)
        return
      }
      setRoleLoading(true)
      setError(null)
      try {
        const { data, error: roleError } = await supabase
          .from("organization_members")
          .select("role")
          .eq("org_id", currentOrg.org_id)
          .eq("user_id", currentUserId)
          .maybeSingle()

        if (roleError && roleError.code !== "PGRST116") {
          throw roleError
        }

        if (data?.role) {
          setCurrentRole(data.role as OrgRole)
        } else {
          setCurrentRole(currentOrg.role || null)
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Unable to load role")
      } finally {
        setRoleLoading(false)
      }
    }

    loadRole()
  }, [currentOrg, currentUserId])

  const value = useMemo<OrgContextValue>(
    () => ({ orgs, currentOrg, currentRole, loading, roleLoading, error, refresh, selectOrg, createOrg }),
    [orgs, currentOrg, currentRole, loading, roleLoading, error, refresh, selectOrg, createOrg]
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

function mergeMemberships(primary: OrgMembership[], extras: OrgMembership[]): OrgMembership[] {
  const byId = new Map<string, OrgMembership>()
  ;[...primary, ...extras].forEach((item) => {
    if (!item) return
    byId.set(item.org_id, item)
  })
  return Array.from(byId.values())
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider")
  }
  return ctx
}

export function useCurrentRole() {
  const { currentRole, roleLoading } = useOrg()
  return { currentRole, roleLoading, isAdmin: currentRole === "admin" }
}
