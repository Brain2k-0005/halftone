import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  DetailRow,
  formatDate,
  RolePill,
  TwoFactorCard,
  USER_ROLES,
} from "@/components/admin/admin-parts"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorText,
  FormDialog,
  PageHeader,
  Pagination,
  SelectField,
  Skeleton,
  TextField,
} from "@/components/app/ui-kit"
import { useApi, useApiMutation, type Paged } from "@/lib/api-client"

export const Route = createFileRoute("/_app/admin/users/$userId")({
  staticData: { crumb: { label: "User", icon: "overview" } },
  head: () => ({ meta: [{ title: "User · Administration · Umami" }] }),
  component: AdminUserPage,
})

interface UserDetail {
  id: string
  username: string
  role: string
  twoFactorRequired?: boolean
  createdAt: string
}

interface SiteRow {
  id: string
  name: string
  domain: string
  createdAt: string
}

interface TeamRow {
  id: string
  name: string
  createdAt: string
  teamUser?: { role: string }[]
}

const BACK =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs hover:bg-accent"

function AdminUserPage() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const user = useApi<UserDetail>(`/users/${userId}`)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sitesPage, setSitesPage] = useState(1)
  const [teamsPage, setTeamsPage] = useState(1)
  const sites = useApi<Paged<SiteRow>>(`/users/${userId}/websites`, {
    page: sitesPage,
    pageSize: 10,
  })
  const teams = useApi<Paged<TeamRow>>(`/users/${userId}/teams`, {
    page: teamsPage,
    pageSize: 10,
  })

  const update = useApiMutation<{
    username?: string
    password?: string
    role?: string
  }>("POST", `/users/${userId}`, [`/users/${userId}`, "/admin/users"])
  const remove = useApiMutation("DELETE", `/users/${userId}`, [
    "/users",
    "/admin/users",
  ])

  const u = user.data

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={u?.username ?? <Skeleton className="h-6 w-40" />}
        description={u && <RolePill role={u.role} />}
        actions={
          <>
            <Link to="/admin/users" className={BACK}>
              <ArrowLeftIcon className="size-4" /> All users
            </Link>
            <Button disabled={!u} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              disabled={!u}
              onClick={() => setDeleting(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard title="Details">
          <ErrorText error={user.error} />
          {u && (
            <dl className="divide-y border-t">
              <DetailRow label="Username">{u.username}</DetailRow>
              <DetailRow label="Role">
                <RolePill role={u.role} />
              </DetailRow>
              <DetailRow label="User ID">
                <span className="font-mono text-xs">{u.id}</span>
              </DetailRow>
              <DetailRow label="Created">{formatDate(u.createdAt)}</DetailRow>
            </dl>
          )}
          {!u && !user.error && <Skeleton className="m-5 mt-2 h-24" />}
        </SectionCard>

        {u && (
          <TwoFactorCard
            kind="users"
            id={userId}
            required={!!u.twoFactorRequired}
          />
        )}
      </div>

      <SectionCard title="Websites" description="Websites owned by this user">
        <DataTable
          rows={sites.data?.data}
          rowKey={(s) => s.id}
          isLoading={sites.isLoading}
          error={sites.error}
          onRowClick={(s) =>
            navigate({
              to: "/admin/websites/$websiteId",
              params: { websiteId: s.id },
            })
          }
          empty={
            <EmptyState
              title="No websites"
              description="This user does not own any websites."
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (s) => <span className="font-semibold">{s.name}</span>,
            },
            { key: "domain", header: "Domain", cell: (s) => s.domain },
            {
              key: "created",
              header: "Created",
              cell: (s) => (
                <span className="text-muted-foreground">
                  {formatDate(s.createdAt)}
                </span>
              ),
            },
          ]}
        />
        {sites.data && (
          <Pagination
            page={sitesPage}
            pageSize={sites.data.pageSize}
            count={sites.data.count}
            onPage={setSitesPage}
          />
        )}
      </SectionCard>

      <SectionCard title="Teams" description="Teams this user is a member of">
        <DataTable
          rows={teams.data?.data}
          rowKey={(t) => t.id}
          isLoading={teams.isLoading}
          error={teams.error}
          onRowClick={(t) =>
            navigate({
              to: "/admin/teams/$teamId",
              params: { teamId: t.id },
            })
          }
          empty={
            <EmptyState
              title="No teams"
              description="This user is not part of any team."
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (t) => <span className="font-semibold">{t.name}</span>,
            },
            {
              key: "role",
              header: "Role",
              cell: (t) => {
                const role = t.teamUser?.[0]?.role
                return role ? <RolePill role={role} /> : "–"
              },
            },
            {
              key: "created",
              header: "Created",
              cell: (t) => (
                <span className="text-muted-foreground">
                  {formatDate(t.createdAt)}
                </span>
              ),
            },
          ]}
        />
        {teams.data && (
          <Pagination
            page={teamsPage}
            pageSize={teams.data.pageSize}
            count={teams.data.count}
            onPage={setTeamsPage}
          />
        )}
      </SectionCard>

      {u && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title="Edit user"
          onSubmit={async (form) => {
            const password = String(form.get("password") ?? "")
            await update.mutateAsync({
              username: String(form.get("username")).trim(),
              role: String(form.get("role")),
              ...(password ? { password } : {}),
            })
            toast.success("User updated")
          }}
        >
          <TextField
            name="username"
            label="Username"
            defaultValue={u.username}
            required
            maxLength={255}
          />
          <SelectField
            name="role"
            label="Role"
            defaultValue={u.role}
            options={USER_ROLES}
          />
          <TextField
            name="password"
            type="password"
            label="New password"
            minLength={8}
            maxLength={255}
            autoComplete="new-password"
            hint="Leave empty to keep the current password."
          />
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${u?.username ?? "user"}?`}
        description="The user and their websites will be removed. This cannot be undone."
        onConfirm={async () => {
          await remove.mutateAsync(undefined)
          toast.success("User deleted")
          await navigate({ to: "/admin/users" })
        }}
      />
    </div>
  )
}
