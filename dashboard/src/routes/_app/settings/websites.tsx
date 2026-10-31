import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router"
import { GlobeIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  DataTable,
  EmptyState,
  Pagination,
} from "@/components/app/ui-kit"
import { AddWebsiteDialog } from "@/components/settings/add-website-dialog"
import { useApi, type Paged } from "@/lib/api-client"
import type { Website } from "@/lib/api"

export const Route = createFileRoute("/_app/settings/websites")({
  staticData: { crumb: { label: "Websites", icon: "websites" } },
  head: () => ({ meta: [{ title: "Websites · Halftone" }] }),
  component: WebsitesSettingsPage,
})

const appRoute = getRouteApi("/_app")
const PAGE_SIZE = 20

function WebsitesSettingsPage() {
  const { teams, teamId } = appRoute.useLoaderData()
  const team = teams.find((t) => t.id === teamId)
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const { data, isLoading, error } = useApi<Paged<Website>>(
    teamId ? `/teams/${teamId}/websites` : "/websites",
    {
      page,
      pageSize: PAGE_SIZE,
    }
  )

  return (
    <>
      <SectionCard
        title="Websites"
        description={
          team
            ? `Websites of the team ${team.name}.`
            : "Your personal websites."
        }
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon />
            Add website
          </Button>
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
              title="No websites yet"
              description="Add a website to start tracking."
              action={
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <PlusIcon />
                  Add website
                </Button>
              }
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
              cell: (w) => (
                <Link
                  to="/websites/$websiteId/settings"
                  params={{ websiteId: w.id }}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium shadow-xs transition-colors hover:bg-accent"
                >
                  <SettingsIcon className="size-3.5" />
                  Settings
                </Link>
              ),
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
        open={adding}
        onOpenChange={setAdding}
        teamId={teamId}
      />
    </>
  )
}
