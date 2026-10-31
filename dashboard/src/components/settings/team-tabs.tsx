import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import {
  GlobeIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pill, SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  CopyField,
  DataTable,
  EmptyState,
  FormDialog,
  Pagination,
  SelectField,
  TextField,
} from "@/components/app/ui-kit"
import { AddWebsiteDialog } from "@/components/settings/add-website-dialog"
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  TEAM_ROLES,
  type TeamDetail,
  type TeamMember,
} from "@/components/settings/team-roles"
import type { User, Website } from "@/lib/api"
import { apiDelete, apiPost, useApi, type Paged } from "@/lib/api-client"
import { setTeamCookie } from "@/lib/team"

const PAGE_SIZE = 20
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

const generateAccessCode = () =>
  "team_" +
  Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => ALPHABET[b % ALPHABET.length]
  ).join("")

/** What the current user may do in a team. */
export function teamPermissions(team: TeamDetail | undefined, user: User) {
  const mine = team?.members?.find((m) => m.userId === user.id)
  const viewOnly = user.role === "view-only"
  return {
    isOwner: mine?.role === TEAM_ROLES.owner && !viewOnly,
    canEdit:
      user.isAdmin ||
      ((mine?.role === TEAM_ROLES.owner || mine?.role === TEAM_ROLES.manager) &&
        !viewOnly),
    isMember: !!mine,
  }
}

/** Refetch everything team related: API queries and the router loader (sidebar team switcher). */
export function useRefreshTeams() {
  const client = useQueryClient()
  const router = useRouter()
  return async () => {
    await client.invalidateQueries({ queryKey: ["api"] })
    await router.invalidate()
  }
}

export function DetailsTab({
  team,
  user,
  canEdit,
  isOwner,
}: {
  team: TeamDetail
  user: User
  canEdit: boolean
  isOwner: boolean
}) {
  const refresh = useRefreshTeams()
  const navigate = useNavigate()
  const [name, setName] = useState(team.name)
  const [accessCode, setAccessCode] = useState(team.accessCode ?? "")
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<"delete" | "leave" | null>(null)

  useEffect(() => {
    setName(team.name)
    setAccessCode(team.accessCode ?? "")
  }, [team.name, team.accessCode])

  const dirty =
    name.trim() !== team.name || accessCode !== (team.accessCode ?? "")

  const save = async () => {
    setSaving(true)
    try {
      await apiPost(`/teams/${team.id}`, { name: name.trim(), accessCode })
      await refresh()
      toast.success("Team saved")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the team"
      )
    } finally {
      setSaving(false)
    }
  }

  const leaveWorkspace = () => {
    if (document.cookie.includes(team.id)) setTeamCookie(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Details"
        description={
          canEdit
            ? "Rename the team or change its access code."
            : "Team information."
        }
      >
        <div className="grid gap-4 px-5 pb-5">
          <CopyField label="Team ID" value={team.id} />
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={!canEdit}
            maxLength={50}
          />
          {canEdit && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <CopyField label="Access code" value={accessCode} />
              </div>
              <Button onClick={() => setAccessCode(generateAccessCode())}>
                <RefreshCwIcon />
                Regenerate
              </Button>
            </div>
          )}
          {canEdit && (
            <div className="flex justify-end">
              <Button
                variant="primary"
                loading={saving}
                disabled={!dirty || !name.trim()}
                onClick={save}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Danger zone"
        description={
          isOwner
            ? "Deleting a team removes it for all members."
            : "You can leave this team at any time."
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
          <p className="text-[13px] text-muted-foreground">
            {isOwner
              ? "Websites of the team are not deleted but become inaccessible to its members."
              : "You will lose access to the team's websites."}
          </p>
          {isOwner || user.isAdmin ? (
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              Delete team
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirm("leave")}>
              Leave team
            </Button>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete team"
        description={
          <>
            Delete <b>{team.name}</b>? This cannot be undone.
          </>
        }
        onConfirm={async () => {
          await apiDelete(`/teams/${team.id}`)
          leaveWorkspace()
          await refresh()
          toast.success("Team deleted")
          await navigate({ to: "/settings/teams" })
        }}
      />
      <ConfirmDialog
        open={confirm === "leave"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Leave team"
        confirmLabel="Leave"
        description={
          <>
            Leave <b>{team.name}</b>?
          </>
        }
        onConfirm={async () => {
          await apiDelete(`/teams/${team.id}/users/${user.id}`)
          leaveWorkspace()
          await refresh()
          toast.success("You left the team")
          await navigate({ to: "/settings/teams" })
        }}
      />
    </div>
  )
}

export function MembersTab({
  team,
  user,
  canEdit,
}: {
  team: TeamDetail
  user: User
  canEdit: boolean
}) {
  const refresh = useRefreshTeams()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useApi<Paged<TeamMember>>(
    `/teams/${team.id}/users`,
    { page, pageSize: PAGE_SIZE }
  )
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [adding, setAdding] = useState(false)
  // Only admins can list all users to pick from (same as the original UI).
  const users = useApi<Paged<{ id: string; username: string }>>(
    user.isAdmin && adding ? "/admin/users" : null,
    {
      pageSize: 200,
    }
  )
  const memberIds = new Set(data?.data.map((m) => m.userId))

  return (
    <>
      <SectionCard
        title="Members"
        description="People with access to this team and its websites."
        actions={
          user.isAdmin && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlusIcon />
              Add member
            </Button>
          )
        }
      >
        <DataTable<TeamMember>
          rows={data?.data}
          rowKey={(m) => m.id}
          isLoading={isLoading}
          error={error}
          empty={<EmptyState icon={UsersIcon} title="No members" />}
          columns={[
            {
              key: "user",
              header: "Username",
              cell: (m) => (
                <span className="font-medium">
                  {m.user?.username}
                  {m.userId === user.id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      you
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "role",
              header: "Role",
              cell: (m) => (
                <Pill tone={m.role === TEAM_ROLES.owner ? "brand" : "neutral"}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </Pill>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              cell: (m) =>
                canEdit && m.role !== TEAM_ROLES.owner ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" onClick={() => setEditing(m)}>
                      Change role
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove member"
                      onClick={() => setRemoving(m)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          count={data?.count ?? 0}
          onPage={setPage}
        />
      </SectionCard>

      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Change role"
        description={editing?.user?.username}
        onSubmit={async (form) => {
          await apiPost(`/teams/${team.id}/users/${editing!.userId}`, {
            role: String(form.get("role")),
          })
          await refresh()
          toast.success("Role updated")
        }}
      >
        <SelectField
          label="Role"
          name="role"
          defaultValue={editing?.role}
          options={ASSIGNABLE_ROLES}
        />
      </FormDialog>

      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add member"
        submitLabel="Add"
        onSubmit={async (form) => {
          await apiPost(`/teams/${team.id}/users`, {
            userId: String(form.get("userId")),
            role: String(form.get("role")),
          })
          await refresh()
          toast.success("Member added")
        }}
      >
        <SelectField
          label="User"
          name="userId"
          required
          defaultValue=""
          options={[
            {
              value: "",
              label: users.isLoading ? "Loading…" : "Select a user",
            },
            ...(users.data?.data ?? [])
              .filter((u) => !memberIds.has(u.id))
              .map((u) => ({ value: u.id, label: u.username })),
          ]}
        />
        <SelectField
          label="Role"
          name="role"
          defaultValue={TEAM_ROLES.member}
          options={ASSIGNABLE_ROLES}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove member"
        confirmLabel="Remove"
        description={
          <>
            Remove <b>{removing?.user?.username}</b> from <b>{team.name}</b>?
          </>
        }
        onConfirm={async () => {
          await apiDelete(`/teams/${team.id}/users/${removing!.userId}`)
          await refresh()
          toast.success("Member removed")
        }}
      />
    </>
  )
}

export function WebsitesTab({
  team,
  user,
  canEdit,
}: {
  team: TeamDetail
  user: User
  canEdit: boolean
}) {
  const refresh = useRefreshTeams()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useApi<Paged<Website>>(
    `/teams/${team.id}/websites`,
    { page, pageSize: PAGE_SIZE }
  )
  const [creating, setCreating] = useState(false)
  const [moving, setMoving] = useState(false)
  const [removing, setRemoving] = useState<Website | null>(null)
  const personal = useApi<Paged<Website>>(moving ? "/websites" : null, {
    pageSize: 200,
  })

  return (
    <>
      <SectionCard
        title="Websites"
        description="Websites shared with the members of this team."
        actions={
          canEdit && (
            <>
              <Button onClick={() => setMoving(true)}>Move existing</Button>
              <Button variant="primary" onClick={() => setCreating(true)}>
                <PlusIcon />
                Add website
              </Button>
            </>
          )
        }
      >
        <DataTable<Website>
          rows={data?.data}
          rowKey={(w) => w.id}
          isLoading={isLoading}
          error={error}
          empty={
            <EmptyState
              icon={GlobeIcon}
              title="No websites in this team"
              description="Add a new website or move one of yours here."
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (w) => <span className="font-medium">{w.name}</span>,
            },
            {
              key: "domain",
              header: "Domain",
              cell: (w) => (
                <span className="text-muted-foreground">{w.domain}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              cell: (w) =>
                canEdit ? (
                  <Button size="sm" onClick={() => setRemoving(w)}>
                    Remove
                  </Button>
                ) : null,
            },
          ]}
        />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          count={data?.count ?? 0}
          onPage={setPage}
        />
      </SectionCard>

      <AddWebsiteDialog
        open={creating}
        onOpenChange={setCreating}
        teamId={team.id}
      />

      <FormDialog
        open={moving}
        onOpenChange={setMoving}
        title="Move existing website"
        description="Transfer one of your personal websites to this team."
        submitLabel="Move"
        onSubmit={async (form) => {
          await apiPost(`/websites/${String(form.get("websiteId"))}/transfer`, {
            teamId: team.id,
          })
          await refresh()
          toast.success("Website moved to the team")
        }}
      >
        <SelectField
          label="Website"
          name="websiteId"
          required
          defaultValue=""
          options={[
            {
              value: "",
              label: personal.isLoading ? "Loading…" : "Select a website",
            },
            ...(personal.data?.data ?? []).map((w) => ({
              value: w.id,
              label: `${w.name} (${w.domain})`,
            })),
          ]}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove website from team"
        confirmLabel="Remove"
        description={
          <>
            <b>{removing?.name}</b> will move back to your personal websites and
            the team loses access.
          </>
        }
        onConfirm={async () => {
          await apiPost(`/websites/${removing!.id}/transfer`, {
            userId: user.id,
          })
          await refresh()
          toast.success("Website removed from the team")
        }}
      />
    </>
  )
}
