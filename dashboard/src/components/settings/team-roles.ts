export const TEAM_ROLES = {
  owner: "team-owner",
  manager: "team-manager",
  member: "team-member",
  viewOnly: "team-view-only",
} as const

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  user: "User",
  "view-only": "View only",
  "team-owner": "Owner",
  "team-manager": "Manager",
  "team-member": "Member",
  "team-view-only": "View only",
}

/** Roles that can be assigned to a member (the owner role is fixed). */
export const ASSIGNABLE_ROLES = [
  { value: TEAM_ROLES.manager, label: "Manager" },
  { value: TEAM_ROLES.member, label: "Member" },
  { value: TEAM_ROLES.viewOnly, label: "View only" },
]

export interface TeamMember {
  id: string
  userId: string
  role: string
  user?: { id: string; username: string }
}

export interface TeamDetail {
  id: string
  name: string
  accessCode?: string
  members?: TeamMember[]
}

export interface TeamRow extends TeamDetail {
  _count?: { websites: number; members: number }
}
