import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  MousePointerClickIcon,
  UndoIcon,
  UsersIcon,
} from "lucide-react"
import { useState } from "react"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { Skeleton } from "@/components/app/ui-kit"
import { TrafficChart, type ChartMode } from "@/components/app/traffic-chart"
import { WebsiteToolbar } from "@/components/app/website-controls"
import {
  ENV_TABS,
  EVENT_TABS,
  LOCATION_TABS,
  PAGE_TABS,
  SOURCE_TABS,
} from "@/components/traffic/metric-tabs"
import {
  bounceRate,
  MetricsCard,
  visitDuration,
  useWebsiteId,
  type Stats,
} from "@/components/traffic/shared"
import { useApi } from "@/lib/api-client"
import type { Point } from "@/lib/api"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import { RANGES } from "@/lib/range"
import { cn } from "@/lib/utils"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/")({
  component: WebsiteDashboard,
})

type StatsResponse = Stats & { comparison: Stats }

function WebsiteDashboard() {
  const websiteId = useWebsiteId()
  const { query, range, custom } = useWebsiteQuery()
  const [mode, setMode] = useState<ChartMode>("both")

  const stats = useApi<StatsResponse>(`/websites/${websiteId}/stats`, query)
  const series = useApi<{ pageviews: Point[]; sessions: Point[] }>(
    `/websites/${websiteId}/pageviews`,
    query
  )
  const active = useApi<{ visitors: number }>(
    `/websites/${websiteId}/active`,
    undefined,
    {
      refetchInterval: 30_000,
    }
  )

  const s = stats.data
  const prev = s?.comparison
  const online = active.data?.visitors ?? 0
  const periodLabel = custom ? "the selected period" : RANGES[range].long

  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar />

      <SectionCard
        dither
        title="Overview"
        description="The key numbers for the period"
        footer={
          <>
            <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  online > 0 ? "bg-success" : "bg-muted-foreground/40"
                )}
                aria-hidden
              />
              <span className="truncate">
                {online} {online === 1 ? "visitor" : "visitors"} online right
                now
                {s && ` · ${formatNumber(s.pageviews)} views in ${periodLabel}`}
              </span>
            </p>
            <Link
              to="/websites/$websiteId/realtime"
              params={{ websiteId }}
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              View realtime <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        }
      >
        {stats.error ? (
          <p className="px-5 py-10 text-center text-sm text-destructive">
            {stats.error.message}
          </p>
        ) : !s || !prev ? (
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <StatGrid
            columns={[
              {
                key: "visitors",
                icon: UsersIcon,
                label: "Visitors",
                value: formatNumber(s.visitors),
                current: s.visitors,
                previous: prev.visitors,
                spark: series.data?.sessions.map((p) => p.y),
              },
              {
                key: "visits",
                icon: MousePointerClickIcon,
                label: "Visits",
                value: formatNumber(s.visits),
                current: s.visits,
                previous: prev.visits,
              },
              {
                key: "views",
                icon: EyeIcon,
                label: "Views",
                value: formatNumber(s.pageviews),
                current: s.pageviews,
                previous: prev.pageviews,
                spark: series.data?.pageviews.map((p) => p.y),
              },
              {
                key: "bounce",
                icon: UndoIcon,
                label: "Bounce rate",
                value: formatPercent(bounceRate(s)),
                current: bounceRate(s),
                previous: bounceRate(prev),
                invert: true,
              },
              {
                key: "duration",
                icon: ClockIcon,
                label: "Visit duration",
                value: formatDuration(visitDuration(s)),
                current: visitDuration(s),
                previous: visitDuration(prev),
              },
            ]}
          />
        )}
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <SectionCard
          dither
          title="Traffic trend"
          description={`Visitors and views per ${query.unit}`}
          actions={
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "both", label: "Combined" },
                { value: "visitors", label: "Visitors" },
                { value: "views", label: "Views" },
              ]}
            />
          }
        >
          <div className="flex h-full flex-col px-5 pb-4">
            {series.error ? (
              <p className="py-10 text-center text-sm text-destructive">
                {series.error.message}
              </p>
            ) : !series.data ? (
              <Skeleton className="min-h-72 flex-1" />
            ) : (
              <TrafficChart
                className="h-auto min-h-72 flex-1"
                pageviews={series.data.pageviews}
                sessions={series.data.sessions}
                unit={query.unit}
                mode={mode}
              />
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              {mode !== "views" && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand" /> Visitors
                </span>
              )}
              {mode !== "visitors" && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-chart-2" /> Views
                </span>
              )}
            </div>
          </div>
        </SectionCard>

        <MetricsCard
          title="Top pages"
          description="The most visited pages"
          tabs={PAGE_TABS}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <MetricsCard
          title="Sources"
          description="Where your visitors come from"
          tabs={SOURCE_TABS}
        />
        <MetricsCard
          title="Location"
          description="Countries and cities"
          tabs={LOCATION_TABS}
        />
        <MetricsCard
          title="Environment"
          description="Browsers, systems and devices"
          tabs={ENV_TABS}
        />
      </div>

      <MetricsCard
        title="Events"
        description="Custom events tracked on this website"
        tabs={EVENT_TABS}
        unit="events"
      />
    </div>
  )
}
