import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  ClockIcon,
  CompassIcon,
  EyeIcon,
  FileTextIcon,
  LinkIcon,
  MonitorIcon,
  MousePointerClickIcon,
  ShareIcon,
  UndoIcon,
  UsersIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Logo } from "@/components/app/logo"
import { RangeSwitch } from "@/components/app/range-switch"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { StatGrid } from "@/components/app/stat"
import { ThemeToggle } from "@/components/app/theme"
import { countryName, flag, TopList } from "@/components/app/top-list"
import { TrafficChart, type ChartMode } from "@/components/app/traffic-chart"
import { EmptyState } from "@/components/app/ui-kit"
import { shareFn } from "@/components/share/share-api"
import type { MetricRow, Point } from "@/lib/api"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import { DEFAULT_RANGE, isRange, type RangeKey } from "@/lib/range"

export const Route = createFileRoute("/share/$slug")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? DEFAULT_RANGE }),
  loader: ({ params, deps }) =>
    shareFn({ data: { slug: params.slug, range: deps.range } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData?.status === "ok"
            ? `${loaderData.name} · Umami`
            : "Shared analytics · Umami",
      },
    ],
  }),
  component: SharePage,
})

interface Tab {
  value: string
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
}: {
  title: string
  description: string
  tabs: Tab[]
  metrics: Record<string, MetricRow[] | undefined>
  unit?: string
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

function Message({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto mt-24 max-w-md rounded-xl border bg-card shadow-xs">
      <EmptyState icon={LinkIcon} title={title} description={description} />
    </div>
  )
}

function SharePage() {
  const data = Route.useLoaderData()
  const { range = DEFAULT_RANGE } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [mode, setMode] = useState<ChartMode>("both")

  return (
    <div className="min-h-svh bg-background">
      <header className="flex h-[52px] items-center gap-3 border-b bg-background px-4 lg:px-6">
        <Logo className="size-5 shrink-0" />
        <h1 className="min-w-0 truncate text-[13px] font-semibold">
          {data.status === "ok" ? data.name : "Shared analytics"}
        </h1>
        {data.status === "ok" && (
          <span className="hidden truncate text-[13px] text-muted-foreground sm:inline">
            {data.domain}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {data.status === "ok" && (
            <RangeSwitch
              value={range}
              onChange={(r) => navigate({ search: { range: r } })}
            />
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-6 lg:py-6">
        {data.status === "missing" && (
          <Message
            title="Link not found"
            description="This share link does not exist or has been disabled."
          />
        )}
        {data.status === "unsupported" && (
          <Message
            title="Nothing to show"
            description="This share link does not include a website overview."
          />
        )}
        {data.status === "ok" && (
          <Overview data={data} mode={mode} setMode={setMode} />
        )}
      </main>

      <footer className="px-4 pb-8 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://umami.is"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground hover:underline"
        >
          Umami
        </a>
      </footer>
    </div>
  )
}

function Overview({
  data,
  mode,
  setMode,
}: {
  data: Extract<ReturnType<typeof Route.useLoaderData>, { status: "ok" }>
  mode: ChartMode
  setMode: (m: ChartMode) => void
}) {
  const { stats, series, unit, metrics } = data
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
              spark: series.sessions.map((p: Point) => p.y),
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
              spark: series.pageviews.map((p: Point) => p.y),
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
          </div>
        </SectionCard>

        <TabbedList
          title="Top pages"
          description="The most visited pages"
          metrics={metrics}
          tabs={[
            { value: "path", label: "Path", icon: () => <FileTextIcon /> },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <TabbedList
          title="Sources"
          description="Where visitors come from"
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
          description="Countries"
          metrics={metrics}
          tabs={[
            {
              value: "country",
              label: "Countries",
              icon: (r) => flag(r.x),
              rowLabel: (r) => countryName(r.x),
            },
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
              icon: () => <MonitorIcon />,
              rowLabel: (r) => <span className="capitalize">{r.x}</span>,
            },
          ]}
        />
      </div>

      {(metrics.event?.length ?? 0) > 0 && (
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
      )}
    </div>
  )
}
