import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import {
  AREA_TAB,
  AreaTabs,
  ErrorText,
  PageHeader,
  Skeleton,
} from "@/components/app/ui-kit"
import {
  DetailsTab,
  MembersTab,
  teamPermissions,
  WebsitesTab,
} from "@/components/settings/team-tabs"
import type { TeamDetail } from "@/components/settings/team-roles"
import { useApi } from "@/lib/api-client"

export const Route = createFileRoute("/_app/settings/teams/$teamId")({
  staticData: { crumb: { label: "Team", icon: "overview" } },
  head: () => ({ meta: [{ title: "Team · Halftone" }] }),
  component: TeamPage,
})

const appRoute = getRouteApi("/_app")
const TABS = [
  { id: "details", label: "Details" },
  { id: "members", label: "Members" },
  { id: "websites", label: "Websites" },
] as const

function TeamPage() {
  const { teamId } = Route.useParams()
  const { user } = appRoute.useLoaderData()
  const {
    data: team,
    isLoading,
    error,
  } = useApi<TeamDetail>(`/teams/${teamId}`)
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("details")
  const { canEdit, isOwner } = teamPermissions(team, user)

  if (error) return <ErrorText error={error} />
  if (isLoading || !team) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={team.name}
        description={
          <Link
            to="/settings/teams"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            All teams
          </Link>
        }
      />
      <AreaTabs>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-status={tab === t.id ? "active" : undefined}
            onClick={() => setTab(t.id)}
            className={AREA_TAB}
          >
            {t.label}
          </button>
        ))}
      </AreaTabs>
      {tab === "details" && (
        <DetailsTab
          team={team}
          user={user}
          canEdit={canEdit}
          isOwner={isOwner}
        />
      )}
      {tab === "members" && (
        <MembersTab team={team} user={user} canEdit={canEdit} />
      )}
      {tab === "websites" && (
        <WebsitesTab team={team} user={user} canEdit={canEdit} />
      )}
    </div>
  )
}
