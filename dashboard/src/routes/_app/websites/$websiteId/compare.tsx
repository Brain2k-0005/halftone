import { createFileRoute, useSearch } from "@tanstack/react-router"
import {
  ClockIcon,
  EyeIcon,
  MousePointerClickIcon,
  UndoIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  DeltaPill,
  SectionCard,
  Segmented,
} from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { Skeleton, SelectField } from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import {
  bounceRate,
  visitDuration,
  ListSkeleton,
  useWebsiteId,
  type Stats,
} from "@/components/traffic/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useApi } from "@/lib/api-client"
import type { MetricRow, Point } from "@/lib/api"
import {
  formatDuration,
  formatNumber,
  formatPercent,
  percentChange,
  formatAxis,
} from "@/lib/format"
import { useSetWebsiteSearch, useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/compare")({
  staticData: { crumb: { label: "Compare", icon: "website" } },
  component: ComparePage,
})

type Mode = "prev" | "yoy"

const VIEWS = [
  ["path", "Path"],
  ["channel", "Channels"],
  ["referrer", "Referrers"],
  ["browser", "Browsers"],
  ["os", "OS"],
  ["device", "Devices"],
  ["country", "Countries"],
  ["region", "Regions"],
  ["city", "Cities"],
  ["language", "Languages"],
  ["screen", "Screens"],
  ["event", "Events"],
  ["utmSource", "UTM source"],
  ["utmMedium", "UTM medium"],
  ["utmCampaign", "UTM campaign"],
  ["utmContent", "UTM content"],
  ["utmTerm", "UTM term"],
  ["hostname", "Hostname"],
  ["distinctId", "Distinct ID"],
  ["tag", "Tags"],
].map(([value, label]) => ({ value: value!, label: label! }))

function compareDates(mode: Mode, startAt: number, endAt: number) {
  if (mode === "yoy") {
    const shift = (ms: number) => {
      const d = new Date(ms)
      d.setFullYear(d.getFullYear() - 1)
      return d.getTime()
    }
    return { startAt: shift(startAt), endAt: shift(endAt) }
  }
  const diff = endAt - startAt
  return { startAt: startAt - diff, endAt: endAt - diff }
}

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en", { dateStyle: "medium" })

const chartConfig = {
  current: { label: "Current", color: "var(--chart-1)" },
  previous: { label: "Previous", color: "var(--chart-2)" },
} satisfies ChartConfig

type StatsResponse = Stats & { comparison: Stats }
interface Pageviews {
  pageviews: Point[]
  sessions: Point[]
  compare?: { pageviews: Point[]; sessions: Point[] }
}

function ComparePage() {
  const websiteId = useWebsiteId()
  const { query, dates } = useWebsiteQuery()
  const search = useSearch({ strict: false }) as { compare?: Mode }
  const set = useSetWebsiteSearch()
  const mode: Mode = search.compare ?? "prev"
  const q = { ...query, compare: mode }
  const prev = compareDates(mode, dates.startAt, dates.endAt)

  const stats = useApi<StatsResponse>(`/websites/${websiteId}/stats`, q)
  const series = useApi<Pageviews>(`/websites/${websiteId}/pageviews`, q)
  const [metric, setMetric] = useState<"visitors" | "views">("views")

  const chartData = useMemo(() => {
    if (!series.data) return []
    const cur =
      metric === "views" ? series.data.pageviews : series.data.sessions
    const old =
      metric === "views"
        ? series.data.compare?.pageviews
        : series.data.compare?.sessions
    return cur.map((p, i) => ({
      i,
      date: p.x,
      current: p.y,
      previous: old?.[i]?.y ?? 0,
      previousDate: old?.[i]?.x,
    }))
  }, [series.data, metric])

  const s = stats.data
  const p = s?.comparison

  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar>
        <Segmented
          value={mode}
          onChange={(m) => set({ compare: m })}
          options={[
            { value: "prev", label: "Previous period" },
            { value: "yoy", label: "Previous year" },
          ]}
        />
      </WebsiteToolbar>

      <SectionCard
        dither
        title="Compare"
        description={`${fmtDate(dates.startAt)} – ${fmtDate(dates.endAt)} vs. ${fmtDate(prev.startAt)} – ${fmtDate(prev.endAt)}`}
      >
        {stats.error ? (
          <p className="px-5 py-10 text-center text-sm text-destructive">
            {stats.error.message}
          </p>
        ) : !s || !p ? (
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
                previous: p.visitors,
              },
              {
                key: "visits",
                icon: MousePointerClickIcon,
                label: "Visits",
                value: formatNumber(s.visits),
                current: s.visits,
                previous: p.visits,
              },
              {
                key: "views",
                icon: EyeIcon,
                label: "Views",
                value: formatNumber(s.pageviews),
                current: s.pageviews,
                previous: p.pageviews,
              },
              {
                key: "bounce",
                icon: UndoIcon,
                label: "Bounce rate",
                value: formatPercent(bounceRate(s)),
                current: bounceRate(s),
                previous: bounceRate(p),
                invert: true,
              },
              {
                key: "duration",
                icon: ClockIcon,
                label: "Visit duration",
                value: formatDuration(visitDuration(s)),
                current: visitDuration(s),
                previous: visitDuration(p),
              },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Trend"
        description={
          metric === "views" ? "Views per period" : "Visitors per period"
        }
        actions={
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: "views", label: "Views" },
              { value: "visitors", label: "Visitors" },
            ]}
          />
        }
      >
        <div className="px-5 pb-4">
          {series.error ? (
            <p className="py-10 text-center text-sm text-destructive">
              {series.error.message}
            </p>
          ) : !series.data ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-72 w-full"
              >
                <LineChart
                  data={chartData}
                  margin={{ left: -12, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(v) =>
                      query.unit === "hour"
                        ? new Date(v).toLocaleTimeString("en", {
                            hour: "numeric",
                          })
                        : new Date(v).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    allowDecimals={false}
                    tickFormatter={formatAxis}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]?.payload
                          return row?.date
                            ? fmtDate(new Date(row.date).getTime())
                            : ""
                        }}
                      />
                    }
                  />
                  <Line
                    dataKey="previous"
                    type="monotone"
                    stroke="var(--color-previous)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                  <Line
                    dataKey="current"
                    type="monotone"
                    stroke="var(--color-current)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand" /> Current
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-chart-2" /> Previous
                </span>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <CompareTables previous={prev} />
    </div>
  )
}

function CompareTables({
  previous,
}: {
  previous: { startAt: number; endAt: number }
}) {
  const websiteId = useWebsiteId()
  const { query, dates } = useWebsiteQuery()
  const [view, setView] = useState("path")
  const path = `/websites/${websiteId}/metrics`
  const cur = useApi<MetricRow[]>(path, { ...query, type: view, limit: 20 })
  const old = useApi<MetricRow[]>(path, {
    ...query,
    ...previous,
    type: view,
    limit: 20,
  })

  const prevByLabel = new Map((old.data ?? []).map((r) => [r.x, r.y]))
  const error = cur.error ?? old.error

  return (
    <SectionCard
      title="Top lists"
      description="The same breakdown for both periods"
      actions={
        <SelectField
          label="View"
          aria-label="Breakdown"
          value={view}
          onChange={(e) => setView(e.target.value)}
          options={VIEWS}
          className="min-w-44 [&>span:first-child]:sr-only"
        />
      }
    >
      <div className="grid border-t lg:grid-cols-2">
        <div>
          <p className="flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground">
            <span>Previous</span>
            <span>
              {fmtDate(previous.startAt)} – {fmtDate(previous.endAt)}
            </span>
          </p>
          {error ? null : !old.data ? (
            <ListSkeleton />
          ) : (
            <Rows rows={old.data} />
          )}
        </div>
        <div className="border-t lg:border-t-0 lg:border-l">
          <p className="flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground">
            <span>Current</span>
            <span>
              {fmtDate(dates.startAt)} – {fmtDate(dates.endAt)}
            </span>
          </p>
          {error ? null : !cur.data ? (
            <ListSkeleton />
          ) : (
            <Rows rows={cur.data} previous={prevByLabel} />
          )}
        </div>
      </div>
      {error && (
        <p className="border-t px-5 py-10 text-center text-sm text-destructive">
          {error.message}
        </p>
      )}
    </SectionCard>
  )
}

function Rows({
  rows,
  previous,
}: {
  rows: MetricRow[]
  previous?: Map<string, number>
}) {
  if (!rows.length) {
    return (
      <p className="flex h-32 items-center justify-center border-t text-sm text-muted-foreground">
        No data
      </p>
    )
  }
  return (
    <ul className="divide-y border-t text-[13px]">
      {rows.map((r, i) => {
        const before = previous?.get(r.x)
        const change = before !== undefined ? percentChange(r.y, before) : null
        return (
          <li key={`${r.x}-${i}`} className="flex h-11 items-center gap-3 px-5">
            <span className="min-w-0 flex-1 truncate" title={r.x}>
              {r.x || "(none)"}
            </span>
            {change !== null && <DeltaPill value={change} />}
            <span className="tabular w-14 text-right font-semibold">
              {formatNumber(r.y)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
