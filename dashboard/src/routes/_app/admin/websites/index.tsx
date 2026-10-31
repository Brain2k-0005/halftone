import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  formatDate,
  SearchInput,
  usePagedList,
} from "@/components/admin/admin-parts"
import { Pill, SectionCard } from "@/components/app/section-card"
import { DataTable, EmptyState, Pagination } from "@/components/app/ui-kit"

export const Route = createFileRoute("/_app/admin/websites/")({
  staticData: { crumb: { label: "Websites", icon: "overview" } },
  head: () => ({ meta: [{ title: "Websites · Administration · Umami" }] }),
  component: AdminWebsitesPage,
})

interface AdminWebsite {
  id: string
  name: string
  domain: string
  createdAt: string
  user: { id: string; username: string } | null
  team: { id: string; name: string } | null
}

function AdminWebsitesPage() {
  const navigate = useNavigate()
  const { query, page, setPage, setSearch } =
    usePagedList<AdminWebsite>("/admin/websites")
  const { data } = query

  return (
    <SectionCard
      title="Websites"
      description={
        data
          ? `${data.count} ${data.count === 1 ? "website" : "websites"}`
          : undefined
      }
      actions={
        <SearchInput onChange={setSearch} placeholder="Search websites …" />
      }
    >
      <DataTable
        rows={data?.data}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        error={query.error}
        onRowClick={(w) =>
          navigate({
            to: "/admin/websites/$websiteId",
            params: { websiteId: w.id },
          })
        }
        empty={
          <EmptyState
            title="No websites found"
            description="Try a different search."
          />
        }
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (w) => <span className="font-semibold">{w.name}</span>,
          },
          { key: "domain", header: "Domain", cell: (w) => w.domain },
          {
            key: "owner",
            header: "Owner",
            cell: (w) =>
              w.team ? (
                <span className="flex items-center gap-2">
                  {w.team.name} <Pill>Team</Pill>
                </span>
              ) : (
                (w.user?.username ?? "–")
              ),
          },
          {
            key: "created",
            header: "Created",
            cell: (w) => (
              <span className="text-muted-foreground">
                {formatDate(w.createdAt)}
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
