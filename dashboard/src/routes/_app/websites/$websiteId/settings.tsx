import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  AREA_TAB,
  AreaTabs,
  ErrorText,
  PageHeader,
  Skeleton,
} from "@/components/app/ui-kit"
import { useWebsiteInfo } from "@/components/behavior/website-info"
import { DataCard } from "@/components/website-settings/data-card"
import { DetailsCard } from "@/components/website-settings/details-card"
import { RecordingCard } from "@/components/website-settings/recording-card"
import { SharingCard } from "@/components/website-settings/sharing-card"
import { TrackingCard } from "@/components/website-settings/tracking-card"

const TABS = [
  { id: "details", label: "Details" },
  { id: "tracking", label: "Tracking code" },
  { id: "sharing", label: "Sharing" },
  { id: "recording", label: "Replays & heatmaps" },
  { id: "data", label: "Data" },
] as const

type Tab = (typeof TABS)[number]["id"]

export const Route = createFileRoute("/_app/websites/$websiteId/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const tab = TABS.find((t) => t.id === s.tab)?.id
    return tab ? { tab } : {}
  },
  staticData: { crumb: { label: "Settings", icon: "website" } },
  component: SettingsPage,
})

function SettingsPage() {
  const { websiteId } = Route.useParams()
  const { tab = "details" } = Route.useSearch()
  const navigate = useNavigate()
  const { data: website, isLoading, error } = useWebsiteInfo(websiteId)

  const select = (next: Tab) =>
    navigate({
      to: ".",
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        tab: next === "details" ? undefined : next,
      })) as never,
      replace: true,
    })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description={
          website
            ? `${website.name} · ${website.domain}`
            : "Manage this website."
        }
      />
      <AreaTabs>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-status={tab === t.id ? "active" : "inactive"}
            onClick={() => select(t.id)}
            className={AREA_TAB}
          >
            {t.label}
          </button>
        ))}
      </AreaTabs>

      {error ? (
        <ErrorText error={error} />
      ) : isLoading || !website ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : tab === "details" ? (
        <DetailsCard website={website} />
      ) : tab === "tracking" ? (
        <TrackingCard websiteId={website.id} />
      ) : tab === "sharing" ? (
        <SharingCard websiteId={website.id} />
      ) : tab === "recording" ? (
        <RecordingCard website={website} />
      ) : (
        <DataCard website={website} />
      )}
    </div>
  )
}
