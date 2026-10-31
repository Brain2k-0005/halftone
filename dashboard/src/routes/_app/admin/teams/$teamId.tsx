import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  DetailRow,
  formatDate,
  RolePill,
  TwoFactorCard,
} from "@/components/admin/admin-parts"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  CopyField,
  DataTable,
  EmptyState,
  ErrorText,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/app/ui-kit"
import { useApi, useApiMutation, type Paged } from "@/lib/api-client"

export const Route = createFileRoute("/_app/admin/teams/$teamId")({
  staticData: { crumb: { label: "Team", icon: "overview" } },
  head: () => ({ meta: [{ title: "Team · Administration · Umami" }] }),
  component: AdminTeamPage,
})

interface TeamDetail {
  id: string
  name: string
  accessCode?: string
  twoFactorRequired?: boolean
  createdAt: string
}

interface MemberRow {
  id: string
  userId: string
  role: string
  createdAt: string
  user: { id: string; username: string }
}

interface SiteRow {
  id: string
  name: string
  domain: string
  createdAt: string
}

const BACK =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs hover:bg-accent"

function AdminTeamPage() {
  const { teamId } = Route.useParams()
  const navigate = useNavigate()
  const team = useApi<TeamDetail>(`/teams/${teamId}`)
  const [deleting, setDeleting] = useState(false)
  const [membersPage, setMembersPage] = useState(1)
  const [sitesPage, setSitesPage] = useState(1)
  const members = useApi<Paged<MemberRow>>(`/teams/${teamId}/users`, {
    page: membersPage,
    pageSize: 10,
  })
  const sites = useApi<Paged<SiteRow>>(`/teams/${teamId}/websites`, {
    page: sitesPage,
    pageSize: 10,
  })
  const remove = useApiMutation("DELETE", `/teams/${teamId}`, [
    "/teams",
    "/admin/teams",
  ])

  const t = team.data

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t?.name ?? <Skeleton className="h-6 w-40" />}
        description="Team"
        actions={
          <>
            <Link to="/admin/teams" className={BACK}>
              <ArrowLeftIcon className="size-4" /> All teams
            </Link>
            <Button
              variant="danger"
              disabled={!t}
              onClick={() => setDeleting(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard title="Details">
          <ErrorText error={team.error} />
          {t && (
            <dl className="divide-y border-t">
              <DetailRow label="Name">{t.name}</DetailRow>
              <DetailRow label="Team ID">
                <span className="font-mono text-xs">{t.id}</span>
              </DetailRow>
              <DetailRow label="Created">{formatDate(t.createdAt)}</DetailRow>
              {t.accessCode && (
                <div className="px-5 py-3">
                  <CopyField label="Access code" value={t.accessCode} />
                </div>
              )}
            </dl>
          )}
          {!t && !team.error && <Skeleton className="m-5 mt-2 h-24" />}
        </SectionCard>

        {t && (
          <TwoFactorCard
            kind="teams"
            id={teamId}
            required={!!t.twoFactorRequired}
          />
        )}
      </div>

      <SectionCard title="Members" description="Users in this team">
        <DataTable
          rows={members.data?.data}
          rowKey={(m) => m.id}
          isLoading={members.isLoading}
          error={members.error}
          onRowClick={(m) =>
            navigate({
              to: "/admin/users/$userId",
              params: { userId: m.userId },
            })
          }
          empty={<EmptyState title="No members" />}
          columns={[
            {
              key: "user",
              header: "User",
              cell: (m) => (
                <span className="font-semibold">{m.user.username}</span>
              ),
            },
            {
              key: "role",
              header: "Role",
              cell: (m) => <RolePill role={m.role} />,
            },
            {
              key: "joined",
              header: "Joined",
              cell: (m) => (
                <span className="text-muted-foreground">
                  {formatDate(m.createdAt)}
                </span>
              ),
            },
          ]}
        />
        {members.data && (
          <Pagination
            page={membersPage}
            pageSize={members.data.pageSize}
            count={members.data.count}
            onPage={setMembersPage}
          />
        )}
      </SectionCard>

      <SectionCard title="Websites" description="Websites owned by this team">
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
              description="This team does not own any websites."
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

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${t?.name ?? "team"}?`}
        description="The team and its memberships will be removed. This cannot be undone."
        onConfirm={async () => {
          await remove.mutateAsync(undefined)
          toast.success("Team deleted")
          await navigate({ to: "/admin/teams" })
        }}
      />
    </div>
  )
}
