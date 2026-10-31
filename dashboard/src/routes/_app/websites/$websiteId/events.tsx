import { createFileRoute } from "@tanstack/react-router"
import {
  EyeIcon,
  MousePointerClickIcon,
  SearchIcon,
  ShapesIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Pill, SectionCard, Segmented } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import {
  DataTable,
  EmptyState,
  Pagination,
  Skeleton,
  type Column,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { Cap, StatTiles, useWebsiteId, when } from "@/components/traffic/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useApi, type Paged } from "@/lib/api-client"
import { formatNumber, formatAxis } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/events")({
  staticData: { crumb: { label: "Events", icon: "website" } },
  component: EventsPage,
})

interface EventsStats {
  events: number
  visitors: number
  visits: number
  uniqueEvents: number
  comparison: {
    events: number
    visitors: number
    visits: number
    uniqueEvents: number
  }
}

interface SeriesRow {
  x: string
  t: string
  y: number
}

interface WebsiteEvent {
  id: string
  sessionId: string
  createdAt: string
  urlPath: string
  eventType: number
  eventName: string | null
  country: string | null
  city: string | null
  device: string | null
  os: string | null
  browser: string | null
  hasData: boolean
}

interface PropertyRow {
  eventName: string
  propertyName: string
  dataType: number
  total: number
}

interface EventDataRow {
  dataKey: string
  stringValue: string | null
  numberValue: string | null
  dateValue: string | null
  dataType: number
}

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]
const OTHER = "Other"
const TYPE_LABELS: Record<number, string> = {
  1: "String",
  2: "Number",
  3: "Boolean",
  4: "Date",
  5: "Array",
}

function EventsPage() {
  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar />
      <EventsOverview />
      <EventsTables />
    </div>
  )
}

function EventsOverview() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const stats = useApi<{ data: EventsStats }>(
    `/websites/${websiteId}/events/stats`,
    query
  )
  const series = useApi<SeriesRow[]>(
    `/websites/${websiteId}/events/series`,
    query
  )

  const { data, config, keys } = useMemo(() => {
    const rows = series.data ?? []
    const totals = new Map<string, number>()
    for (const r of rows) totals.set(r.x, (totals.get(r.x) ?? 0) + r.y)
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
    const shown = top.slice(0, SERIES_COLORS.length)
    const hasOther = top.length > shown.length
    const keys = hasOther ? [...shown, OTHER] : shown
    const byDate = new Map<string, Record<string, number | string>>()
    for (const r of rows) {
      const key = shown.includes(r.x) ? r.x : OTHER
      const row = byDate.get(r.t) ?? { t: r.t }
      row[key] = ((row[key] as number) ?? 0) + r.y
      byDate.set(r.t, row)
    }
    const config: ChartConfig = Object.fromEntries(
      keys.map((k, i) => [
        k,
        {
          label: k,
          color: k === OTHER ? "var(--muted-foreground)" : SERIES_COLORS[i],
        },
      ])
    )
    return {
      data: [...byDate.values()].sort((a, b) =>
        String(a.t).localeCompare(String(b.t))
      ),
      config,
      keys,
    }
  }, [series.data])

  const s = stats.data?.data
  const change = (cur: number, prev: number) =>
    prev
      ? `${cur >= prev ? "+" : "−"}${Math.abs(((cur - prev) / prev) * 100).toFixed(1)} % vs. previous period`
      : undefined

  return (
    <SectionCard
      dither
      title="Events"
      description="Custom events tracked on this website"
    >
      <StatTiles
        loading={!s}
        tiles={[
          {
            icon: MousePointerClickIcon,
            label: "Events",
            value: formatNumber(s?.events ?? 0),
            hint: s && change(s.events, s.comparison.events),
          },
          {
            icon: UsersIcon,
            label: "Visitors",
            value: formatNumber(s?.visitors ?? 0),
            hint: s && change(s.visitors, s.comparison.visitors),
          },
          {
            icon: EyeIcon,
            label: "Visits",
            value: formatNumber(s?.visits ?? 0),
            hint: s && change(s.visits, s.comparison.visits),
          },
          {
            icon: ShapesIcon,
            label: "Unique events",
            value: formatNumber(s?.uniqueEvents ?? 0),
            hint: s && change(s.uniqueEvents, s.comparison.uniqueEvents),
          },
        ]}
      />
      <div className="border-t px-5 pt-4 pb-4">
        {series.error ? (
          <p className="py-10 text-center text-sm text-destructive">
            {series.error.message}
          </p>
        ) : !series.data ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No events in this period
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="aspect-auto h-64 w-full">
              <BarChart data={data} margin={{ left: -12, right: 4, top: 8 }}>
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
                  width={48}
                  allowDecimals={false}
                  tickFormatter={formatAxis}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const raw = payload?.[0]?.payload?.t
                        return raw
                          ? new Date(raw).toLocaleDateString("en", {
                              dateStyle: "medium",
                            })
                          : ""
                      }}
                    />
                  }
                />
                {keys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="events"
                    fill={config[k]?.color}
                    radius={i === keys.length - 1 ? [3, 3, 0, 0] : 0}
                    maxBarSize={22}
                  />
                ))}
              </BarChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {keys.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: config[k]?.color }}
                  />{" "}
                  {k}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  )
}

type View = "activity" | "properties"

function EventsTables() {
  const [view, setView] = useState<View>("activity")
  return (
    <>
      <SectionCard
        title={view === "activity" ? "Activity" : "Properties"}
        description={
          view === "activity"
            ? "Page views and custom events as they happened"
            : "Event data sent along with events"
        }
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "activity", label: "Activity" },
              { value: "properties", label: "Properties" },
            ]}
          />
        }
      >
        {view === "activity" ? <ActivityTable /> : <PropertiesTable />}
      </SectionCard>
    </>
  )
}

function ActivityTable() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<WebsiteEvent | null>(null)
  const { data, isLoading, error } = useApi<Paged<WebsiteEvent>>(
    `/websites/${websiteId}/events`,
    { ...query, page, pageSize: 20, search },
    { placeholderData: (prev) => prev }
  )

  const columns: Column<WebsiteEvent>[] = [
    {
      key: "event",
      header: "Event",
      cell: (e) =>
        e.eventType === 2 ? (
          <Pill tone="brand">{e.eventName}</Pill>
        ) : (
          <span className="text-muted-foreground">Page view</span>
        ),
    },
    {
      key: "path",
      header: "Page",
      cell: (e) => <span className="font-medium">{e.urlPath}</span>,
    },
    {
      key: "country",
      header: "Location",
      cell: (e) =>
        e.country ? (
          <span className="whitespace-nowrap">
            {flag(e.country)} {countryName(e.country)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "env",
      header: "Environment",
      cell: (e) => (
        <span className="whitespace-nowrap text-muted-foreground">
          <Cap>{e.browser}</Cap> · {e.os} · <Cap>{e.device}</Cap>
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      align: "right",
      cell: (e) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {when(e.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="px-5 pb-3">
        <label className="relative block max-w-xs">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search events"
            className="h-8 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        error={error}
        onRowClick={(e) => e.hasData && setSelected(e)}
        empty={
          <EmptyState
            icon={MousePointerClickIcon}
            title="No events"
            description="Nothing matches this period and filters."
          />
        }
      />
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          count={data.count}
          onPage={setPage}
        />
      )}
      <EventDetail
        websiteId={websiteId}
        event={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

function valueOf(r: EventDataRow) {
  return r.stringValue ?? r.numberValue ?? r.dateValue ?? ""
}

function EventDetail({
  websiteId,
  event,
  onClose,
}: {
  websiteId: string
  event: WebsiteEvent | null
  onClose: () => void
}) {
  const { data, isLoading } = useApi<EventDataRow[]>(
    event ? `/websites/${websiteId}/event-data/${event.id}` : null
  )
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event?.eventName ?? "Event"} properties</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <dl className="divide-y rounded-lg border text-[13px]">
            {(data ?? []).map((r) => (
              <div
                key={r.dataKey}
                className="flex items-center justify-between gap-4 px-3 py-2"
              >
                <dt className="text-muted-foreground">{r.dataKey}</dt>
                <dd className="tabular truncate font-medium">{valueOf(r)}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PropertiesTable() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [selected, setSelected] = useState<PropertyRow | null>(null)
  const { data, isLoading, error } = useApi<PropertyRow[]>(
    `/websites/${websiteId}/event-data/properties`,
    query
  )
  const values = useApi<{ value: string; total: number }[]>(
    selected ? `/websites/${websiteId}/event-data/values` : null,
    selected
      ? {
          ...query,
          event: selected.eventName,
          propertyName: selected.propertyName,
        }
      : undefined
  )

  const columns: Column<PropertyRow>[] = [
    {
      key: "event",
      header: "Event",
      cell: (r) => <Pill tone="brand">{r.eventName}</Pill>,
    },
    {
      key: "property",
      header: "Property",
      cell: (r) => <span className="font-medium">{r.propertyName}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span className="text-muted-foreground">
          {TYPE_LABELS[r.dataType] ?? "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Records",
      align: "right",
      cell: (r) => formatNumber(r.total),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => `${r.eventName}:${r.propertyName}`}
        isLoading={isLoading}
        error={error}
        onRowClick={setSelected}
        empty={
          <EmptyState
            icon={ShapesIcon}
            title="No properties"
            description="No event data was sent in this period."
          />
        }
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected?.eventName} · {selected?.propertyName}
            </DialogTitle>
          </DialogHeader>
          {values.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border text-[13px]">
              {(values.data ?? []).map((v) => (
                <li
                  key={v.value}
                  className="flex items-center justify-between gap-4 px-3 py-2"
                >
                  <span className="truncate">{v.value}</span>
                  <span className="tabular font-medium">
                    {formatNumber(v.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
