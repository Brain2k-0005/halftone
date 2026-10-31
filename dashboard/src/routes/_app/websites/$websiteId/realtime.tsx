import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ActivityIcon,
  EyeIcon,
  GlobeIcon,
  MousePointerClickIcon,
  UsersIcon,
} from "lucide-react"
import { useEffect } from "react"
import { Bar, BarChart, XAxis } from "recharts"
import { SectionCard } from "@/components/app/section-card"
import { countryName, flag, TopList } from "@/components/app/top-list"
import { Badge } from "@/components/reui/badge"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { realtimeFn } from "@/lib/api"
import { formatNumber } from "@/lib/format"

const REFRESH_MS = 10_000

export const Route = createFileRoute("/_app/websites/$websiteId/realtime")({
  loader: ({ params }) => realtimeFn({ data: params.websiteId }),
  staticData: { crumb: { label: "Realtime" } },
  component: RealtimePage,
})

const toRows = (obj: Record<string, number>) =>
  Object.entries(obj)
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 8)

const chartConfig = {
  views: { label: "Views", color: "var(--chart-1)" },
} satisfies ChartConfig

function RealtimePage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.invalidate(), REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const tiles = [
    { icon: <UsersIcon />, label: "Online now", value: data.active },
    { icon: <EyeIcon />, label: "Views (30 min)", value: data.totals.views },
    {
      icon: <MousePointerClickIcon />,
      label: "Events (30 min)",
      value: data.totals.events,
    },
    { icon: <GlobeIcon />, label: "Countries", value: data.totals.countries },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <SectionCard
        title="Realtime"
        description="Activity in the last 30 minutes"
        actions={
          <Badge variant="success-light" radius="full">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Live · refreshes every 10s
          </Badge>
        }
      >
        <div className="grid grid-cols-2 divide-x border-t lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col gap-2 px-5 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
                {t.icon}
                {t.label}
              </div>
              <div className="tabular text-2xl font-semibold tracking-tight">
                {formatNumber(t.value)}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t px-3 pt-4 pb-3">
          {data.series.views.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              No views in the last 30 minutes
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-44 w-full"
            >
              <BarChart
                data={data.series.views.map((p) => ({ t: p.x, views: p.y }))}
              >
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="views"
                  fill="var(--color-views)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <SectionCard
          title="Pages"
          description="Viewed right now"
          bodyClassName="border-t"
        >
          <TopList
            rows={toRows(data.urls)}
            empty="No page views in the last 30 minutes"
          />
        </SectionCard>
        <SectionCard
          title="Referrers"
          description="Current traffic sources"
          bodyClassName="border-t"
        >
          <TopList
            rows={toRows(data.referrers)}
            empty="No referrers in the last 30 minutes"
          />
        </SectionCard>
        <SectionCard
          title="Countries"
          description="Where visitors are"
          bodyClassName="border-t"
        >
          <TopList
            rows={toRows(data.countries)}
            renderIcon={(r) => flag(r.x)}
            renderLabel={(r) => countryName(r.x)}
            empty="No visitors in the last 30 minutes"
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Activity"
        description="Latest views and events"
        bodyClassName="border-t"
      >
        {data.events.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Waiting for activity…
          </div>
        ) : (
          <ul className="divide-y">
            {data.events.slice(0, 30).map((e, i) => (
              <li
                key={`${e.createdAt}-${i}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background dark:bg-input/30 [&_svg]:size-3.5">
                  {e.eventName ? <ActivityIcon /> : <EyeIcon />}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {e.eventName ? (
                    <>
                      Triggered{" "}
                      <span className="font-medium">{e.eventName}</span>
                    </>
                  ) : (
                    <>
                      Viewed{" "}
                      <span className="font-medium">{e.urlPath ?? "/"}</span>
                    </>
                  )}
                  {e.country && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {flag(e.country)} {countryName(e.country)}
                    </span>
                  )}
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleTimeString("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
