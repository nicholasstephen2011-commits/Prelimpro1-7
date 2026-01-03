"use client"

import { useCurrentRole } from "../contexts/OrgContext"

export default function RoleBadge() {
  const { isAdmin, currentRole, roleLoading } = useCurrentRole()

  if (roleLoading || !currentRole) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-40 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
      {isAdmin ? "Admin" : "Member"}
    </div>
  )
}
