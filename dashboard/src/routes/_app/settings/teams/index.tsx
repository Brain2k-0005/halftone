import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router"
import { LogInIcon, PlusIcon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  DataTable,
  EmptyState,
  FormDialog,
  Pagination,
  TextField,
} from "@/components/app/ui-kit"
import {
  ROLE_LABEL,
  TEAM_ROLES,
  type TeamRow,
} from "@/components/settings/team-roles"
import { useRefreshTeams } from "@/components/settings/team-tabs"
import { apiPost, useApi, type Paged } from "@/lib/api-client"

export const Route = createFileRoute("/_app/settings/teams/")({
  staticData: { crumb: { label: "Teams", icon: "overview" } },
  head: () => ({ meta: [{ title: "Teams · Halftone" }] }),
  component: TeamsPage,
})

const appRoute = getRouteApi("/_app")
const PAGE_SIZE = 20

function TeamsPage() {
  const { user } = appRoute.useLoaderData()
  const refresh = useRefreshTeams()
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<"create" | "join" | null>(null)
  const { data, isLoading, error } = useApi<Paged<TeamRow>>("/me/teams", {
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <>
      <SectionCard
        title="Teams"
        description="Teams share websites and reports between their members."
        actions={
          <>
            <Button onClick={() => setDialog("join")}>
              <LogInIcon />
              Join team
            </Button>
            <Button variant="primary" onClick={() => setDialog("create")}>
              <PlusIcon />
              Create team
            </Button>
          </>
        }
      >
        <DataTable<TeamRow>
          rows={data?.data}
          rowKey={(t) => t.id}
          isLoading={isLoading}
          error={error}
          empty={
            <EmptyState
              icon={UsersIcon}
              title="No teams yet"
              description="Create a team or join one with an access code."
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (t) => (
                <Link
                  to="/settings/teams/$teamId"
                  params={{ teamId: t.id }}
                  className="font-medium hover:underline"
                >
                  {t.name}
                </Link>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              cell: (t) =>
                t.members?.find((m) => m.role === TEAM_ROLES.owner)?.user
                  ?.username ?? "",
            },
            {
              key: "role",
              header: "Your role",
              cell: (t) => {
                const mine = t.members?.find((m) => m.userId === user.id)
                return mine ? (ROLE_LABEL[mine.role] ?? mine.role) : ""
              },
            },
            {
              key: "members",
              header: "Members",
              align: "right",
              cell: (t) => t._count?.members ?? 0,
            },
            {
              key: "websites",
              header: "Websites",
              align: "right",
              cell: (t) => t._count?.websites ?? 0,
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
        open={dialog === "create"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Create team"
        submitLabel="Create"
        onSubmit={async (form) => {
          await apiPost("/teams", {
            name: String(form.get("name") ?? "").trim(),
          })
          await refresh()
          toast.success("Team created")
        }}
      >
        <TextField
          label="Name"
          name="name"
          required
          maxLength={50}
          autoComplete="off"
          autoFocus
        />
      </FormDialog>

      <FormDialog
        open={dialog === "join"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Join team"
        description="Ask a team owner or manager for the team's access code."
        submitLabel="Join"
        onSubmit={async (form) => {
          await apiPost("/teams/join", {
            accessCode: String(form.get("accessCode") ?? "").trim(),
          })
          await refresh()
          toast.success("You joined the team")
        }}
      >
        <TextField
          label="Access code"
          name="accessCode"
          required
          maxLength={50}
          autoComplete="off"
          autoFocus
        />
      </FormDialog>
    </>
  )
}
