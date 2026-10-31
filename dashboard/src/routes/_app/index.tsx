import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  UndoIcon,
  UsersIcon,
} from "lucide-react"
import { RangeSwitch } from "@/components/app/range-switch"
import { SectionCard } from "@/components/app/section-card"
import { Stat } from "@/components/app/stat"
import { TrafficChart } from "@/components/app/traffic-chart"
import { websitesSummaryFn, type Point, type Stats } from "@/lib/api"
import {
  formatDuration,
  formatNumber,
  formatPercent,
  percentChange,
} from "@/lib/format"
import {
  DEFAULT_RANGE,
  isRange,
  RANGES,
  resolveRange,
  type RangeKey,
} from "@/lib/range"

export const Route = createFileRoute("/_app/")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? DEFAULT_RANGE }),
  loader: ({ deps }) => websitesSummaryFn({ data: { range: deps.range } }),
  staticData: { crumb: { label: "Overview" } },
  component: OverviewPage,
})

function sumSeries(series: Point[][]) {
  const map = new Map<string, number>()
  for (const s of series)
    for (const p of s) map.set(p.x, (map.get(p.x) ?? 0) + p.y)
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([x, y]) => ({ x, y }))
}

function OverviewPage() {
  const sites = Route.useLoaderData()
  const { range = DEFAULT_RANGE } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const sum = (pick: (s: Stats) => number, prev = false) =>
    sites.reduce(
      (acc, site) => acc + pick(prev ? site.stats.comparison : site.stats),
      0
    )

  const visitors = sum((s) => s.visitors)
  const prevVisitors = sum((s) => s.visitors, true)
  const visits = sum((s) => s.visits)
  const prevVisits = sum((s) => s.visits, true)
  const views = sum((s) => s.pageviews)
  const prevViews = sum((s) => s.pageviews, true)
  const bounce = visits
    ? (Math.min(
        visits,
        sum((s) => s.bounces)
      ) /
        visits) *
      100
    : 0
  const prevBounce = prevVisits
    ? (Math.min(
        prevVisits,
        sum((s) => s.bounces, true)
      ) /
        prevVisits) *
      100
    : 0
  const duration = visits ? sum((s) => s.totaltime) / visits : 0
  const prevDuration = prevVisits
    ? sum((s) => s.totaltime, true) / prevVisits
    : 0

  const sessions = sumSeries(sites.map((s) => s.sessions))
  const pageviews = sumSeries(sites.map((s) => s.pageviews))
  const active = sites.reduce((acc, s) => acc + s.active, 0)
  const change = percentChange(visitors, prevVisitors)
  const ranked = [...sites].sort((a, b) => b.stats.visitors - a.stats.visitors)
  const maxVisitors = Math.max(1, ...ranked.map((s) => s.stats.visitors))

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <SectionCard
        title="Overview"
        description="The key numbers across all websites"
        actions={
          <RangeSwitch
            value={range}
            onChange={(r) => navigate({ search: { range: r } })}
          />
        }
        footer={
          <>
            <span className="flex min-w-0 items-center gap-2">
              <InfoIcon className="size-4 shrink-0" />
              <span className="truncate">
                {formatNumber(visitors)} visitors in {RANGES[range].long}
                {change !== null &&
                  change !== 0 &&
                  `, ${Math.abs(Math.round(change))} % ${change > 0 ? "above" : "below"} the previous period`}
                {active > 0 && ` · ${active} online now`}
              </span>
            </span>
            <Link
              to="/websites"
              className="flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
            >
              View websites <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0">
          <Stat
            icon={<UsersIcon />}
            label="Visitors"
            value={formatNumber(visitors)}
            current={visitors}
            previous={prevVisitors}
            spark={sessions.map((p) => p.y)}
          />
          <Stat
            icon={<EyeIcon />}
            label="Views"
            value={formatNumber(views)}
            current={views}
            previous={prevViews}
            spark={pageviews.map((p) => p.y)}
          />
          <Stat
            icon={<UndoIcon />}
            label="Bounce rate"
            value={formatPercent(bounce)}
            current={bounce}
            previous={prevBounce}
            invert
          />
          <Stat
            icon={<ClockIcon />}
            label="Avg. visit duration"
            value={formatDuration(duration)}
            current={duration}
            previous={prevDuration}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard
          title="Visitor trend"
          description={`Unique visitors per ${resolveRange(range).unit}, all websites`}
        >
          <div className="px-3 pb-4">
            <TrafficChart
              pageviews={sessions}
              sessions={sessions}
              unit={resolveRange(range).unit}
              mode="visitors"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Top websites"
          description="Ranked by visitors in the period"
          actions={
            <Link
              to="/websites"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
        >
          {ranked.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No websites yet
            </div>
          ) : (
            <ul className="divide-y border-t">
              {ranked.map((site) => (
                <li key={site.id}>
                  <Link
                    to="/websites/$websiteId"
                    params={{ websiteId: site.id }}
                    search={{ range }}
                    className="block px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background dark:bg-input/30">
                        <GlobeIcon className="size-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {site.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {site.domain}
                          {site.active > 0 && ` · ${site.active} online`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabular text-sm font-semibold">
                          {formatNumber(site.stats.visitors)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          visitors
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-chart-1"
                        style={{
                          width: `${(site.stats.visitors / maxVisitors) * 100}%`,
                        }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
