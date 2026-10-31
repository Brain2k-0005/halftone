import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Pill,
  SectionCard,
  Segmented,
  type Tone,
} from "@/components/app/section-card"
import {
  DataTable,
  EmptyState,
  Skeleton,
  type Column,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { Cap, ListSkeleton, useWebsiteId } from "@/components/traffic/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/performance")({
  staticData: { crumb: { label: "Performance", icon: "website" } },
  component: PerformancePage,
})

const METRICS = ["lcp", "inp", "cls", "fcp", "ttfb"] as const
type Metric = (typeof METRICS)[number]
type Percentile = "p50" | "p75" | "p95"

const NAMES: Record<Metric, string> = {
  lcp: "Largest Contentful Paint",
  inp: "Interaction to Next Paint",
  cls: "Cumulative Layout Shift",
  fcp: "First Contentful Paint",
  ttfb: "Time to First Byte",
}

const THRESHOLDS: Record<Metric, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
}

type Stats = Record<Metric, Record<Percentile, number>> & { count: number }

interface ChartRow {
  t: string
  p50: number
  p75: number
  p95: number
}

interface MetricRow {
  name: string
  p50: number
  p75: number
  p95: number
}

const PERCENTILES: { value: Percentile; label: string }[] = [
  { value: "p50", label: "p50" },
  { value: "p75", label: "p75" },
  { value: "p95", label: "p95" },
]

function formatMetric(metric: Metric, value: number) {
  if (metric === "cls") return value.toFixed(3)
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`
  return `${Math.round(value)} ms`
}

function rating(metric: Metric, value: number): { label: string; tone: Tone } {
  const t = THRESHOLDS[metric]
  if (value <= 0 || value <= t.good) return { label: "Good", tone: "success" }
  if (value <= t.poor) return { label: "Needs work", tone: "warning" }
  return { label: "Poor", tone: "danger" }
}

const DOT: Partial<Record<Tone, string>> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

const chartConfig = {
  p50: { label: "p50", color: "var(--chart-2)" },
  p75: { label: "p75", color: "var(--chart-1)" },
  p95: { label: "p95", color: "var(--chart-4)" },
} satisfies ChartConfig

function PerformancePage() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [metric, setMetric] = useState<Metric>("lcp")
  const [percentile, setPercentile] = useState<Percentile>("p75")

  const stats = useApi<Stats>(`/websites/${websiteId}/performance/stats`, query)
  const chart = useApi<{ chart: ChartRow[] }>(
    `/websites/${websiteId}/performance/chart`,
    { ...query, metric }
  )

  const rows = (chart.data?.chart ?? []).map((r) => ({
    t: r.t,
    p50: Number(r.p50),
    p75: Number(r.p75),
    p95: Number(r.p95),
  }))

  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar>
        <Segmented
          value={percentile}
          options={PERCENTILES}
          onChange={setPercentile}
        />
      </WebsiteToolbar>

      <SectionCard
        dither
        title="Web vitals"
        description={
          stats.data
            ? `${formatNumber(stats.data.count)} samples · ${percentile} per metric`
            : "Core web vitals"
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-5">
          {METRICS.map((m, i) => {
            const value = Number(stats.data?.[m]?.[percentile] ?? 0)
            const r = rating(m, value)
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={cn(
                  "min-w-0 px-5 py-4 text-left transition-colors hover:bg-accent/40",
                  i % 2 === 1 && "border-l",
                  i > 1 && "border-t lg:border-t-0",
                  i > 0 && "lg:border-l",
                  metric === m && "bg-brand-soft/50"
                )}
              >
                <p className="text-[13px] font-medium text-muted-foreground uppercase">
                  {m}
                </p>
                {stats.data ? (
                  <p className="tabular mt-3 text-2xl leading-none font-semibold tracking-tight whitespace-nowrap">
                    {formatMetric(m, value)}
                  </p>
                ) : (
                  <Skeleton className="mt-3 h-6 w-16" />
                )}
                <div className="mt-3 flex min-h-5 items-center gap-2 text-xs">
                  {stats.data && <Pill tone={r.tone}>{r.label}</Pill>}
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {NAMES[m]}
                </p>
              </button>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={NAMES[metric]}
        description="Percentiles over time"
        actions={
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            {PERCENTILES.map((p) => (
              <span key={p.value} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: chartConfig[p.value].color }}
                />
                {p.label}
              </span>
            ))}
          </span>
        }
      >
        <div className="px-5 pb-4">
          {chart.error ? (
            <p className="py-10 text-center text-sm text-destructive">
              {chart.error.message}
            </p>
          ) : !chart.data ? (
            <Skeleton className="h-72 w-full" />
          ) : rows.length === 0 ? (
            <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              No performance data for this period
            </p>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-72 w-full"
            >
              <LineChart data={rows} margin={{ left: -4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
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
                  width={56}
                  tickFormatter={(v) => formatMetric(metric, Number(v))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="tabular font-medium">
                            {formatMetric(metric, Number(value))}
                          </span>
                        </span>
                      )}
                    />
                  }
                />
                {(["p50", "p75", "p95"] as const).map((k) => (
                  <Line
                    key={k}
                    dataKey={k}
                    type="monotone"
                    stroke={`var(--color-${k})`}
                    strokeWidth={k === percentile ? 2.5 : 1.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <PerformanceList
          title="Pages"
          description={`${metric.toUpperCase()} by page`}
          tabs={[
            { value: "path", label: "Path" },
            { value: "title", label: "Title" },
          ]}
          metric={metric}
          percentile={percentile}
        />
        <PerformanceList
          title="Environment"
          description={`${metric.toUpperCase()} by device and browser`}
          tabs={[
            { value: "device", label: "Device" },
            { value: "browser", label: "Browser" },
          ]}
          metric={metric}
          percentile={percentile}
        />
      </div>
    </div>
  )
}

function PerformanceList({
  title,
  description,
  tabs,
  metric,
  percentile,
}: {
  title: string
  description: string
  tabs: { value: string; label: string }[]
  metric: Metric
  percentile: Percentile
}) {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [type, setType] = useState(tabs[0]!.value)
  const { data, error } = useApi<MetricRow[]>(
    `/websites/${websiteId}/performance/metrics`,
    {
      ...query,
      metric,
      type,
      limit: 50,
    }
  )

  const rows = (data ?? [])
    .filter((r) => Number(r[percentile]) > 0)
    .slice(0, 20)
  const columns: Column<MetricRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => (
        <span className="block max-w-64 truncate font-medium" title={r.name}>
          {type === "device" || type === "browser" ? (
            <Cap>{r.name}</Cap>
          ) : (
            r.name
          )}
        </span>
      ),
    },
    {
      key: "value",
      header: `${metric.toUpperCase()} ${percentile}`,
      align: "right",
      cell: (r) => {
        const v = Number(r[percentile])
        return (
          <span className="flex items-center justify-end gap-2">
            {formatMetric(metric, v)}
            <span
              className={cn("size-2 rounded-full", DOT[rating(metric, v).tone])}
              aria-hidden
            />
          </span>
        )
      },
    },
  ]

  return (
    <SectionCard
      title={title}
      description={description}
      actions={<Segmented value={type} options={tabs} onChange={setType} />}
    >
      {!data && !error ? (
        <ListSkeleton />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.name}
          error={error}
          empty={
            <EmptyState
              title="No data"
              description="No samples for this metric in the period."
            />
          }
        />
      )}
    </SectionCard>
  )
}
