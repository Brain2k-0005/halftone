import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  ClockIcon,
  CompassIcon,
  EyeIcon,
  FileTextIcon,
  LogInIcon,
  LogOutIcon,
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
import { Segmented, SectionCard } from "@/components/app/section-card"
import { Stat } from "@/components/app/stat"
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
            limit: 8,
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

function TabbedList({
  title,
  description,
  tabs,
  metrics,
}: {
  title: string
  description: string
  tabs: {
    value: MetricType
    label: string
    icon?: (row: MetricRow) => ReactNode
    label_?: (row: MetricRow) => ReactNode
  }[]
  metrics: Record<string, MetricRow[]>
}) {
  const [tab, setTab] = useState(tabs[0]!.value)
  const active = tabs.find((t) => t.value === tab)!

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        tabs.length > 1 && (
          <Segmented value={tab} options={tabs} onChange={setTab} />
        )
      }
      bodyClassName="border-t"
    >
      <TopList
        rows={metrics[tab] ?? []}
        renderIcon={active.icon}
        renderLabel={active.label_}
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
    <div className="flex flex-col gap-4 md:gap-6">
      <SectionCard
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
            <span className="flex items-center gap-2">
              <span className="relative flex size-2">
                {active > 0 && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${active > 0 ? "bg-success" : "bg-muted-foreground/40"}`}
                />
              </span>
              {active} {active === 1 ? "visitor" : "visitors"} online right now
              · {formatNumber(stats.pageviews)} views in {RANGES[range].long}
            </span>
            <Link
              to="/websites/$websiteId/realtime"
              params={{ websiteId }}
              className="flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
            >
              View realtime <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x lg:grid-cols-3 2xl:grid-cols-5 2xl:divide-y-0">
          <Stat
            icon={<UsersIcon />}
            label="Visitors"
            value={formatNumber(stats.visitors)}
            current={stats.visitors}
            previous={prev.visitors}
            spark={series.sessions.map((p) => p.y)}
          />
          <Stat
            icon={<MousePointerClickIcon />}
            label="Visits"
            value={formatNumber(stats.visits)}
            current={stats.visits}
            previous={prev.visits}
          />
          <Stat
            icon={<EyeIcon />}
            label="Views"
            value={formatNumber(stats.pageviews)}
            current={stats.pageviews}
            previous={prev.pageviews}
            spark={series.pageviews.map((p) => p.y)}
            sparkColor="var(--chart-1)"
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
            label="Visit duration"
            value={formatDuration(duration)}
            current={duration}
            previous={prevDuration}
          />
        </div>
      </SectionCard>

      <SectionCard
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
        <div className="px-3 pb-4">
          <TrafficChart
            pageviews={series.pageviews}
            sessions={series.sessions}
            unit={unit}
            mode={mode}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <TabbedList
          title="Pages"
          description="Most visited pages"
          metrics={metrics}
          tabs={[
            { value: "path", label: "Path", icon: () => <FileTextIcon /> },
            { value: "entry", label: "Entry", icon: () => <LogInIcon /> },
            { value: "exit", label: "Exit", icon: () => <LogOutIcon /> },
          ]}
        />
        <TabbedList
          title="Sources"
          description="Where your visitors come from"
          metrics={metrics}
          tabs={[
            {
              value: "referrer",
              label: "Referrers",
              icon: () => <ShareIcon />,
              label_: (r) => r.x || "Direct / none",
            },
            {
              value: "channel",
              label: "Channels",
              icon: () => <CompassIcon />,
              label_: (r) => (
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
              label_: (r) => countryName(r.x),
            },
            { value: "city", label: "Cities", icon: () => <CompassIcon /> },
          ]}
        />
        <TabbedList
          title="Environment"
          description="Browsers, systems and devices"
          metrics={metrics}
          tabs={[
            {
              value: "browser",
              label: "Browsers",
              icon: () => <CompassIcon />,
              label_: (r) => <span className="capitalize">{r.x}</span>,
            },
            { value: "os", label: "OS", icon: () => <MonitorIcon /> },
            {
              value: "device",
              label: "Devices",
              icon: (r) => DEVICE_ICONS[r.x] ?? <MonitorIcon />,
              label_: (r) => <span className="capitalize">{r.x}</span>,
            },
          ]}
        />
      </div>

      <TabbedList
        title="Events"
        description="Custom events tracked on this website"
        metrics={metrics}
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
