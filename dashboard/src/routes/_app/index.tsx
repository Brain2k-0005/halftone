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
import { Progress, SectionCard } from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { TrafficChart } from "@/components/app/traffic-chart"
import { defaultRange } from "@/lib/default-range"
import { websitesSummaryFn, type Point, type Stats } from "@/lib/api"
import {
  formatDuration,
  formatNumber,
  formatPercent,
  percentChange,
} from "@/lib/format"
import { isRange, RANGES, resolveRange, type RangeKey } from "@/lib/range"

export const Route = createFileRoute("/_app/")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? defaultRange() }),
  loader: ({ deps }) => websitesSummaryFn({ data: { range: deps.range } }),
  staticData: { crumb: { label: "Overview", icon: "overview" } },
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
  const range = Route.useSearch().range ?? defaultRange()
  const navigate = useNavigate({ from: Route.fullPath })
  const unit = resolveRange(range).unit

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
    <div className="flex flex-col gap-5">
      <SectionCard
        dither
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
            <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <InfoIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {formatNumber(visitors)} visitors in {RANGES[range].long}
                {change !== null &&
                  change !== 0 &&
                  `, ${Math.abs(Math.round(change))} % ${change > 0 ? "above" : "below"} the previous period`}
                {active > 0 && ` · ${active} online now`}
              </span>
            </p>
            <Link
              to="/websites"
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              View websites <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        }
      >
        <StatGrid
          columns={[
            {
              key: "visitors",
              icon: UsersIcon,
              label: "Visitors",
              value: formatNumber(visitors),
              current: visitors,
              previous: prevVisitors,
              spark: sessions.map((p) => p.y),
            },
            {
              key: "views",
              icon: EyeIcon,
              label: "Views",
              value: formatNumber(views),
              current: views,
              previous: prevViews,
              spark: pageviews.map((p) => p.y),
            },
            {
              key: "bounce",
              icon: UndoIcon,
              label: "Bounce rate",
              value: formatPercent(bounce),
              current: bounce,
              previous: prevBounce,
              invert: true,
            },
            {
              key: "duration",
              icon: ClockIcon,
              label: "Avg. visit duration",
              value: formatDuration(duration),
              current: duration,
              previous: prevDuration,
            },
          ]}
        />
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <SectionCard
          dither
          title="Visitor trend"
          description={`Unique visitors per ${unit}, all websites`}
        >
          <div className="flex h-full flex-col px-5 pb-4">
            <TrafficChart
              className="h-auto min-h-72 flex-1"
              pageviews={sessions}
              sessions={sessions}
              unit={unit}
              mode="visitors"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Top websites"
          description="The busiest websites in the period"
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
            <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No websites yet
            </p>
          ) : (
            <ul className="divide-y border-t">
              {ranked.map((site) => (
                <li key={site.id}>
                  <Link
                    to="/websites/$websiteId"
                    params={{ websiteId: site.id }}
                    search={{ range }}
                    className="block px-5 py-3.5 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
                        <GlobeIcon className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {site.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {site.domain}
                          {site.active > 0 && ` · ${site.active} online`}
                        </p>
                      </div>
                      <span className="tabular text-[13px] font-semibold">
                        {formatNumber(site.stats.visitors)}
                      </span>
                    </div>
                    <Progress
                      className="mt-3"
                      percent={(site.stats.visitors / maxVisitors) * 100}
                    />
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
