import { createFileRoute } from "@tanstack/react-router"
import {
  CoinsIcon,
  CreditCardIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { countryName, flag, TopList } from "@/components/app/top-list"
import {
  DataTable,
  EmptyState,
  ErrorText,
  LoadingRows,
  PageHeader,
  Pagination,
  SelectField,
  Skeleton,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatMoney } from "@/components/reports/common"
import { CURRENCIES } from "@/components/reports/currencies"
import type { MetricRow } from "@/lib/api"
import { type Paged, useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/revenue")({
  staticData: { crumb: { label: "Revenue", icon: "website" } },
  component: RevenuePage,
})

interface Totals {
  sum: string | number
  count: number
  unique_count: number
  total_sessions: number
  average: number
  arpu: number
}
type Stats = Totals & { comparison: Totals }

interface ChartRow {
  x: string
  t: string
  y: string | number
  count: number
}

interface RevenueSession {
  id: string
  browser: string
  os: string
  device: string
  country: string
  visits: number
  views: number
  events: number
  lastAt: string
}

const METRIC_TYPES = [
  { value: "country", label: "Country" },
  { value: "region", label: "Region" },
  { value: "referrer", label: "Referrer" },
  { value: "channel", label: "Channel" },
] as const
type MetricType = (typeof METRIC_TYPES)[number]["value"]

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function formatTick(value: string, unit: string) {
  const d = new Date(value)
  if (unit === "hour") return d.toLocaleTimeString("en", { hour: "numeric" })
  if (unit === "month") return d.toLocaleDateString("en", { month: "short" })
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
}

function RevenueChart({
  rows,
  unit,
  currency,
}: {
  rows: ChartRow[]
  unit: string
  currency: string
}) {
  const { data, events, config } = useMemo(() => {
    const events = [...new Set(rows.map((r) => r.x))]
    const byDate = new Map<string, Record<string, number | string>>()
    for (const r of rows) {
      const row = byDate.get(r.t) ?? { date: r.t }
      row[`e${events.indexOf(r.x)}`] = Number(r.y)
      byDate.set(r.t, row)
    }
    const config: ChartConfig = Object.fromEntries(
      events.map((name, i) => [
        `e${i}`,
        { label: name, color: COLORS[i % COLORS.length] },
      ])
    )
    return {
      data: [...byDate.values()].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      ),
      events,
      config,
    }
  }, [rows])

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: -4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) => formatTick(v, unit)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const raw = payload?.[0]?.payload?.date
                return raw
                  ? new Date(raw).toLocaleDateString("en", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    })
                  : ""
              }}
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ background: item.color }}
                    />
                    {config[String(name)]?.label}
                  </span>
                  <span className="tabular font-medium">
                    {formatMoney(Number(value), currency)}
                  </span>
                </div>
              )}
            />
          }
        />
        {events.map((_, i) => (
          <Bar
            key={i}
            dataKey={`e${i}`}
            stackId="revenue"
            fill={`var(--color-e${i})`}
            radius={i === events.length - 1 ? [3, 3, 0, 0] : 0}
            maxBarSize={22}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function SessionsTable({
  websiteId,
  currency,
}: {
  websiteId: string
  currency: string
}) {
  const { query } = useWebsiteQuery()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useApi<Paged<RevenueSession>>(
    `/websites/${websiteId}/revenue/sessions`,
    {
      ...query,
      currency,
      page,
      pageSize: 10,
    }
  )

  return (
    <SectionCard
      title="Sessions with revenue"
      description="Visitors who generated revenue in this period"
    >
      <DataTable
        rows={data?.data}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        error={error}
        empty={
          <EmptyState
            icon={CreditCardIcon}
            title="No revenue sessions"
            description="No purchases were tracked in this period."
          />
        }
        columns={[
          {
            key: "session",
            header: "Session",
            cell: (s) => (
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {s.browser} · {s.os}
                </p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {s.device}
                </p>
              </div>
            ),
          },
          {
            key: "country",
            header: "Country",
            cell: (s) => (
              <span className="whitespace-nowrap">
                {flag(s.country)}{" "}
                {s.country ? countryName(s.country) : "Unknown"}
              </span>
            ),
          },
          {
            key: "visits",
            header: "Visits",
            align: "right",
            cell: (s) => formatNumber(s.visits),
          },
          {
            key: "views",
            header: "Views",
            align: "right",
            cell: (s) => formatNumber(s.views),
          },
          {
            key: "events",
            header: "Events",
            align: "right",
            cell: (s) => formatNumber(s.events),
          },
          {
            key: "last",
            header: "Last seen",
            align: "right",
            cell: (s) =>
              new Date(s.lastAt).toLocaleString("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }),
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

function RevenuePage() {
  const { websiteId } = Route.useParams()
  const { query, dates } = useWebsiteQuery()
  const [currency, setCurrency] = useState("USD")
  const [metric, setMetric] = useState<MetricType>("country")
  const params = { ...query, currency }

  const stats = useApi<Stats>(`/websites/${websiteId}/revenue/stats`, params)
  const chart = useApi<{ chart: ChartRow[] }>(
    `/websites/${websiteId}/revenue/chart`,
    params
  )
  const metrics = useApi<{ name: string; value: string | number }[]>(
    `/websites/${websiteId}/revenue/metrics`,
    {
      ...params,
      type: metric,
    }
  )

  const money = (v: number) => formatMoney(v, currency)
  const s = stats.data
  const c = s?.comparison
  const rows: MetricRow[] = (metrics.data ?? []).map((r) => ({
    x: r.name,
    y: Number(r.value),
  }))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Revenue"
        description="Revenue from tracked events that carry a revenue property."
      />
      <WebsiteToolbar>
        <SelectField
          label="Currency"
          aria-label="Currency"
          className="w-56 [&>span:first-child]:sr-only"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={CURRENCIES}
        />
      </WebsiteToolbar>

      <SectionCard dither>
        {stats.error ? (
          <ErrorText error={stats.error} />
        ) : !s || !c ? (
          <div className="p-5">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <StatGrid
            columns={[
              {
                key: "sum",
                icon: CoinsIcon,
                label: "Revenue",
                value: money(Number(s.sum)),
                current: Number(s.sum),
                previous: Number(c.sum),
              },
              {
                key: "count",
                icon: ReceiptIcon,
                label: "Transactions",
                value: formatNumber(s.count),
                current: s.count,
                previous: c.count,
              },
              {
                key: "unique",
                icon: UsersIcon,
                label: "Customers",
                value: formatNumber(s.unique_count),
                current: s.unique_count,
                previous: c.unique_count,
              },
              {
                key: "average",
                icon: TrendingUpIcon,
                label: "Average order",
                value: money(s.average ?? 0),
                current: s.average ?? 0,
                previous: c.average ?? 0,
              },
              {
                key: "arpu",
                icon: CreditCardIcon,
                label: "Revenue per visitor",
                value: money(s.arpu ?? 0),
                current: s.arpu ?? 0,
                previous: c.arpu ?? 0,
              },
            ]}
          />
        )}
        <div className="border-t px-3 pt-4 pb-3">
          {chart.error ? (
            <ErrorText error={chart.error} />
          ) : !chart.data ? (
            <Skeleton className="mx-2 h-72" />
          ) : chart.data.chart.length ? (
            <RevenueChart
              rows={chart.data.chart}
              unit={dates.unit}
              currency={currency}
            />
          ) : (
            <EmptyState
              icon={CoinsIcon}
              title="No revenue yet"
              description="Track events with a revenue property to see them here."
            />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Revenue by"
        description="Top sources of revenue"
        actions={
          <Segmented
            value={metric}
            options={[...METRIC_TYPES]}
            onChange={setMetric}
          />
        }
      >
        {metrics.error ? (
          <ErrorText error={metrics.error} className="border-t" />
        ) : metrics.isLoading ? (
          <LoadingRows rows={5} />
        ) : (
          <TopList
            rows={rows.slice(0, 10)}
            renderIcon={
              metric === "country" ? (r) => <span>{flag(r.x)}</span> : undefined
            }
            renderLabel={
              metric === "country" ? (r) => countryName(r.x) : undefined
            }
            renderMeta={(row, share) =>
              `${money(row.y)} · ${Math.round(share)} % of revenue`
            }
            empty="No revenue in this period"
          />
        )}
      </SectionCard>

      <SessionsTable websiteId={websiteId} currency={currency} />
    </div>
  )
}
