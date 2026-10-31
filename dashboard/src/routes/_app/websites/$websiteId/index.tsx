import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  ClockIcon,
  CompassIcon,
  EyeIcon,
  FileTextIcon,
  LogInIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorIcon,
  MousePointerClickIcon,
  ShareIcon,
  SmartphoneIcon,
  TabletIcon,
  UndoIcon,
  UsersIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { RangeSwitch } from "@/components/app/range-switch"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { countryName, flag, TopList } from "@/components/app/top-list"
import { TrafficChart, type ChartMode } from "@/components/app/traffic-chart"
import {
  metricsFn,
  overviewFn,
  type MetricRow,
  type MetricType,
} from "@/lib/api"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import { DEFAULT_RANGE, isRange, RANGES, type RangeKey } from "@/lib/range"
import { cn } from "@/lib/utils"

const TYPES = [
  "path",
  "entry",
  "exit",
  "referrer",
  "channel",
  "browser",
  "os",
  "device",
  "country",
  "city",
  "event",
] as const

export const Route = createFileRoute("/_app/websites/$websiteId/")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? DEFAULT_RANGE }),
  loader: async ({ params, deps }) => {
    const [overview, ...lists] = await Promise.all([
      overviewFn({ data: { websiteId: params.websiteId, range: deps.range } }),
      ...TYPES.map((type) =>
        metricsFn({
          data: {
            websiteId: params.websiteId,
            range: deps.range,
            type,
            limit: 6,
          },
        })
      ),
    ])
    const metrics = Object.fromEntries(
      TYPES.map((t, i) => [t, lists[i]])
    ) as Record<(typeof TYPES)[number], MetricRow[]>
    return { overview, metrics }
  },
  component: WebsiteDashboard,
})

const DEVICE_ICONS: Record<string, ReactNode> = {
  desktop: <MonitorIcon />,
  laptop: <MonitorIcon />,
  mobile: <SmartphoneIcon />,
  tablet: <TabletIcon />,
}

interface Tab {
  value: MetricType
  label: string
  icon?: (row: MetricRow) => ReactNode
  rowLabel?: (row: MetricRow) => ReactNode
}

function TabbedList({
  title,
  description,
  tabs,
  metrics,
  unit = "visitors",
  className,
}: {
  title: string
  description: string
  tabs: Tab[]
  metrics: Record<string, MetricRow[]>
  unit?: string
  className?: string
}) {
  const [tab, setTab] = useState(tabs[0]!.value)
  const active = tabs.find((t) => t.value === tab)!

  return (
    <SectionCard
      title={title}
      description={description}
      className={className}
      actions={
        tabs.length > 1 && (
          <Segmented value={tab} options={tabs} onChange={setTab} />
        )
      }
    >
      <TopList
        rows={metrics[tab] ?? []}
        renderIcon={active.icon}
        renderLabel={active.rowLabel}
        renderMeta={(row, share) =>
          `${formatNumber(row.y)} ${unit} · ${Math.round(share)} %`
        }
      />
    </SectionCard>
  )
}

function WebsiteDashboard() {
  const { overview, metrics } = Route.useLoaderData()
  const { websiteId } = Route.useParams()
  const { range = DEFAULT_RANGE } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [mode, setMode] = useState<ChartMode>("both")

  const { stats, series, active, unit } = overview
  const prev = stats.comparison
  const bounce = stats.visits
    ? (Math.min(stats.visits, stats.bounces) / stats.visits) * 100
    : 0
  const prevBounce = prev.visits
    ? (Math.min(prev.visits, prev.bounces) / prev.visits) * 100
    : 0
  const duration = stats.visits ? stats.totaltime / stats.visits : 0
  const prevDuration = prev.visits ? prev.totaltime / prev.visits : 0

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        dither
        title="Overview"
        description="The key numbers for the period"
        actions={
          <RangeSwitch
            value={range}
            onChange={(r) => navigate({ search: { range: r } })}
          />
        }
        footer={
          <>
            <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  active > 0 ? "bg-success" : "bg-muted-foreground/40"
                )}
                aria-hidden
              />
              <span className="truncate">
                {active} {active === 1 ? "visitor" : "visitors"} online right
                now · {formatNumber(stats.pageviews)} views in{" "}
                {RANGES[range].long}
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
        <StatGrid
          columns={[
            {
              key: "visitors",
              icon: UsersIcon,
              label: "Visitors",
              value: formatNumber(stats.visitors),
              current: stats.visitors,
              previous: prev.visitors,
              spark: series.sessions.map((p) => p.y),
            },
            {
              key: "visits",
              icon: MousePointerClickIcon,
              label: "Visits",
              value: formatNumber(stats.visits),
              current: stats.visits,
              previous: prev.visits,
            },
            {
              key: "views",
              icon: EyeIcon,
              label: "Views",
              value: formatNumber(stats.pageviews),
              current: stats.pageviews,
              previous: prev.pageviews,
              spark: series.pageviews.map((p) => p.y),
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
              label: "Visit duration",
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
          title="Traffic trend"
          description={`Visitors and views per ${unit}`}
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
            <TrafficChart
              className="h-auto min-h-72 flex-1"
              pageviews={series.pageviews}
              sessions={series.sessions}
              unit={unit}
              mode={mode}
            />
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

        <TabbedList
          title="Top pages"
          description="The most visited pages"
          metrics={metrics}
          tabs={[
            { value: "path", label: "Path", icon: () => <FileTextIcon /> },
            { value: "entry", label: "Entry", icon: () => <LogInIcon /> },
            { value: "exit", label: "Exit", icon: () => <LogOutIcon /> },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <TabbedList
          title="Sources"
          description="Where your visitors come from"
          metrics={metrics}
          tabs={[
            {
              value: "referrer",
              label: "Referrers",
              icon: () => <ShareIcon />,
              rowLabel: (r) => r.x || "Direct / none",
            },
            {
              value: "channel",
              label: "Channels",
              icon: () => <CompassIcon />,
              rowLabel: (r) => (
                <span className="capitalize">{r.x || "direct"}</span>
              ),
            },
          ]}
        />
        <TabbedList
          title="Location"
          description="Countries and cities"
          metrics={metrics}
          tabs={[
            {
              value: "country",
              label: "Countries",
              icon: (r) => flag(r.x),
              rowLabel: (r) => countryName(r.x),
            },
            { value: "city", label: "Cities", icon: () => <MapPinIcon /> },
          ]}
        />
        <TabbedList
          title="Environment"
          description="Browsers, systems and devices"
          metrics={metrics}
          tabs={[
            {
              value: "browser",
              label: "Browser",
              icon: () => <CompassIcon />,
              rowLabel: (r) => <span className="capitalize">{r.x}</span>,
            },
            { value: "os", label: "OS", icon: () => <MonitorIcon /> },
            {
              value: "device",
              label: "Device",
              icon: (r) => DEVICE_ICONS[r.x] ?? <MonitorIcon />,
              rowLabel: (r) => <span className="capitalize">{r.x}</span>,
            },
          ]}
        />
      </div>

      <TabbedList
        title="Events"
        description="Custom events tracked on this website"
        metrics={metrics}
        unit="events"
        tabs={[
          {
            value: "event",
            label: "Events",
            icon: () => <MousePointerClickIcon />,
          },
        ]}
      />
    </div>
  )
}
