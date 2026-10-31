import {
  ClockIcon,
  EyeIcon,
  MousePointerClickIcon,
  RepeatIcon,
  UndoIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Segmented } from "@/components/app/section-card"
import { StatGrid, type StatColumn } from "@/components/app/stat"
import { countryName, flag, TopList } from "@/components/app/top-list"
import { TrafficChart, type ChartMode } from "@/components/app/traffic-chart"
import { Skeleton } from "@/components/app/ui-kit"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useApi } from "@/lib/api-client"
import type { MetricRow, Point, Stats } from "@/lib/api"
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatAxis,
} from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"
import { cn } from "@/lib/utils"

/*
 * Analytics building blocks. Each one takes the id of a website, link or pixel (Umami serves all three
 * through /websites/:id/*) and reads date range + filters from the URL via useWebsiteQuery.
 * They are used by the link/pixel detail pages and as widgets of boards.
 */

type StatsResponse = Stats & { comparison: Stats }

function BlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("m-5 h-32", className)} />
}

function BlockError({ error }: { error: unknown }) {
  return (
    <p className="flex h-32 items-center justify-center px-5 text-center text-sm text-destructive">
      {error instanceof Error ? error.message : "Failed to load"}
    </p>
  )
}

/** Visitors / visits / views (+ bounce rate and duration for websites). */
export function StatsBlock({
  id,
  full = true,
}: {
  id: string
  full?: boolean
}) {
  const { query } = useWebsiteQuery()
  const { data, error } = useApi<StatsResponse>(`/websites/${id}/stats`, query)
  if (error) return <BlockError error={error} />
  if (!data) return <BlockSkeleton />

  const prev = data.comparison
  const bounce = data.visits
    ? (Math.min(data.visits, data.bounces) / data.visits) * 100
    : 0
  const prevBounce = prev.visits
    ? (Math.min(prev.visits, prev.bounces) / prev.visits) * 100
    : 0
  const duration = data.visits ? data.totaltime / data.visits : 0
  const prevDuration = prev.visits ? prev.totaltime / prev.visits : 0

  const columns: StatColumn[] = [
    {
      key: "visitors",
      icon: UsersIcon,
      label: "Visitors",
      value: formatNumber(data.visitors),
      current: data.visitors,
      previous: prev.visitors,
    },
    {
      key: "visits",
      icon: RepeatIcon,
      label: "Visits",
      value: formatNumber(data.visits),
      current: data.visits,
      previous: prev.visits,
    },
    {
      key: "views",
      icon: EyeIcon,
      label: "Views",
      value: formatNumber(data.pageviews),
      current: data.pageviews,
      previous: prev.pageviews,
    },
  ]
  if (full) {
    columns.push(
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
        label: "Visit duration",
        value: formatDuration(duration),
        current: duration,
        previous: prevDuration,
      }
    )
  }
  return <StatGrid columns={columns} />
}

/** Page views + visitors over time. */
export function ChartBlock({
  id,
  mode: initial = "both",
  className,
}: {
  id: string
  mode?: ChartMode
  className?: string
}) {
  const { query } = useWebsiteQuery()
  const { data, error } = useApi<{ pageviews: Point[]; sessions: Point[] }>(
    `/websites/${id}/pageviews`,
    query
  )
  const [mode, setMode] = useState<ChartMode>(initial)
  if (error) return <BlockError error={error} />
  if (!data) return <BlockSkeleton className="h-60" />
  return (
    <div className="px-3 pb-4">
      <div className="mb-2 flex justify-end px-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "both", label: "Both" },
            { value: "visitors", label: "Visitors" },
            { value: "views", label: "Views" },
          ]}
        />
      </div>
      <TrafficChart
        pageviews={data.pageviews}
        sessions={data.sessions}
        unit={query.unit}
        mode={mode}
        className={className ?? "h-60"}
      />
    </div>
  )
}

/** Ranked list of one metric dimension. */
export function MetricsBlock({
  id,
  type,
  limit = 10,
  unit = "visitors",
}: {
  id: string
  type: string
  limit?: number | string
  unit?: string
}) {
  const { query } = useWebsiteQuery()
  const { data, error } = useApi<MetricRow[]>(`/websites/${id}/metrics`, {
    ...query,
    type,
    limit: Number(limit),
  })
  if (error) return <BlockError error={error} />
  if (!data) return <BlockSkeleton />
  const isCountry = type === "country"
  return (
    <TopList
      rows={data}
      renderIcon={isCountry ? (row) => flag(row.x) : undefined}
      renderLabel={isCountry ? (row) => countryName(row.x) : undefined}
      renderMeta={(row, share) =>
        `${formatNumber(row.y)} ${unit} · ${Math.round(share)} %`
      }
    />
  )
}

/** Metric list with a segmented switch between dimensions. */
export function MetricTabs({
  id,
  tabs,
  limit = 10,
  unit,
}: {
  id: string
  tabs: { value: string; label: string }[]
  limit?: number
  unit?: string
}) {
  const [tab, setTab] = useState(tabs[0]!.value)
  return (
    <>
      <div className="px-5 pb-3">
        <Segmented value={tab} onChange={setTab} options={tabs} />
      </div>
      <MetricsBlock id={id} type={tab} limit={limit} unit={unit} />
    </>
  )
}

/** Custom events per day, stacked by event name (top 5). */
export function EventsChartBlock({ id }: { id: string }) {
  const { query } = useWebsiteQuery()
  const { data, error } = useApi<{ x: string; t: string; y: number }[]>(
    `/websites/${id}/events/series`,
    query
  )
  const { rows, names, config } = useMemo(() => {
    const totals = new Map<string, number>()
    for (const p of data ?? []) totals.set(p.x, (totals.get(p.x) ?? 0) + p.y)
    const names = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([n]) => n)
    const byTime = new Map<string, Record<string, number | string>>()
    for (const p of data ?? []) {
      if (!names.includes(p.x)) continue
      const row = byTime.get(p.t) ?? { t: p.t }
      row[p.x] = p.y
      byTime.set(p.t, row)
    }
    const config: ChartConfig = Object.fromEntries(
      names.map((n, i) => [
        n,
        { label: n, color: `var(--chart-${(i % 5) + 1})` },
      ])
    )
    return {
      rows: [...byTime.values()].sort((a, b) =>
        String(a.t).localeCompare(String(b.t))
      ),
      names,
      config,
    }
  }, [data])
  if (error) return <BlockError error={error} />
  if (!data) return <BlockSkeleton className="h-60" />
  if (!names.length)
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No events in this period
      </p>
    )
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-60 w-full px-3 pb-4"
    >
      <BarChart data={rows} margin={{ left: -12, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en", {
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
        <ChartTooltip content={<ChartTooltipContent />} />
        {names.map((n) => (
          <Bar
            key={n}
            dataKey={n}
            stackId="e"
            fill={`var(--color-${n})`}
            maxBarSize={18}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/** Visitors, visits, events, unique events. */
export function EventStatsBlock({ id }: { id: string }) {
  const { query } = useWebsiteQuery()
  const { data: raw, error } = useApi<Record<string, unknown>>(
    `/websites/${id}/events/stats`,
    query
  )
  if (error) return <BlockError error={error} />
  if (!raw) return <BlockSkeleton />
  // The endpoint wraps its payload in `data`.
  const d = ((raw.data as Record<string, unknown> | undefined) ??
    raw) as Record<string, number> & {
    comparison?: Record<string, number>
  }
  const c = d.comparison ?? {}
  const col = (
    key: string,
    label: string,
    icon: StatColumn["icon"]
  ): StatColumn => ({
    key,
    icon,
    label,
    value: formatNumber(d[key] ?? 0),
    current: d[key] ?? 0,
    previous: c[key] ?? 0,
  })
  return (
    <StatGrid
      columns={[
        col("visitors", "Visitors", UsersIcon),
        col("visits", "Visits", RepeatIcon),
        col("events", "Events", MousePointerClickIcon),
        col("uniqueEvents", "Unique events", ZapIcon),
      ]}
    />
  )
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Traffic heatmap: weekday x hour. */
export function WeeklyBlock({ id }: { id: string }) {
  const { query } = useWebsiteQuery()
  const { data, error } = useApi<number[][]>(
    `/websites/${id}/sessions/weekly`,
    query
  )
  if (error) return <BlockError error={error} />
  if (!data) return <BlockSkeleton />
  const max = Math.max(1, ...data.flat())
  return (
    <div className="overflow-x-auto px-5 pb-4">
      <div className="grid min-w-[480px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-0.5 text-[10px] text-muted-foreground">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
        {data.map((hours, d) => (
          <div key={d} className="contents">
            <span className="flex items-center">{DAYS[d]}</span>
            {hours.map((v, h) => (
              <span
                key={h}
                title={`${DAYS[d]} ${h}:00 · ${v}`}
                className="aspect-square rounded-[3px] bg-brand"
                style={{ opacity: v ? 0.15 + (v / max) * 0.85 : 0.06 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Visitors online right now. */
export function ActiveBlock({ id }: { id: string }) {
  const { data, error } = useApi<{ visitors: number }>(
    `/websites/${id}/active`,
    undefined,
    {
      refetchInterval: 10_000,
    }
  )
  if (error) return <BlockError error={error} />
  return (
    <div className="flex min-h-24 items-center gap-3 px-5 pb-5">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-success" />
      </span>
      <p className="tabular text-3xl font-semibold tracking-tight">
        {data ? formatNumber(data.visitors) : "–"}
      </p>
      <p className="text-[13px] text-muted-foreground">visitors online</p>
    </div>
  )
}
