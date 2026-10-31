import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  formatDate,
  SearchInput,
  usePagedList,
} from "@/components/admin/admin-parts"
import { Pill, SectionCard } from "@/components/app/section-card"
import { DataTable, EmptyState, Pagination } from "@/components/app/ui-kit"

export const Route = createFileRoute("/_app/admin/teams/")({
  staticData: { crumb: { label: "Teams", icon: "overview" } },
  head: () => ({ meta: [{ title: "Teams · Administration · Umami" }] }),
  component: AdminTeamsPage,
})

interface AdminTeam {
  id: string
  name: string
  createdAt: string
  members: { role: string; user: { id: string; username: string } }[]
  _count: { websites: number; members: number }
}

function AdminTeamsPage() {
  const navigate = useNavigate()
  const { query, page, setPage, setSearch } =
    usePagedList<AdminTeam>("/admin/teams")
  const { data } = query

  return (
    <SectionCard
      title="Teams"
      description={
        data
          ? `${data.count} ${data.count === 1 ? "team" : "teams"}`
          : undefined
      }
      actions={
        <SearchInput onChange={setSearch} placeholder="Search teams …" />
      }
    >
      <DataTable
        rows={data?.data}
        rowKey={(t) => t.id}
        isLoading={query.isLoading}
        error={query.error}
        onRowClick={(t) =>
          navigate({ to: "/admin/teams/$teamId", params: { teamId: t.id } })
        }
        empty={
          <EmptyState
            title="No teams found"
            description="Teams are created by users in their settings."
          />
        }
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (t) => <span className="font-semibold">{t.name}</span>,
          },
          {
            key: "owner",
            header: "Owner",
            cell: (t) => {
              const owner = t.members.find((m) => m.role === "team-owner")
              return owner ? (
                <Pill tone="brand">{owner.user.username}</Pill>
              ) : (
                "–"
              )
            },
          },
          {
            key: "members",
            header: "Members",
            align: "right",
            cell: (t) => t._count.members,
          },
          {
            key: "websites",
            header: "Websites",
            align: "right",
            cell: (t) => t._count.websites,
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
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          count={data.count}
          onPage={setPage}
        />
      )}
    </SectionCard>
  )
}
