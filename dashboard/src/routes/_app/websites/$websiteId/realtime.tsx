import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ActivityIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MousePointerClickIcon,
  ShareIcon,
  UsersIcon,
} from "lucide-react"
import { useEffect } from "react"
import { Bar, BarChart, XAxis } from "recharts"
import { Pill, SectionCard } from "@/components/app/section-card"
import { countryName, flag, TopList } from "@/components/app/top-list"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { realtimeFn } from "@/lib/api"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const REFRESH_MS = 10_000

export const Route = createFileRoute("/_app/websites/$websiteId/realtime")({
  loader: ({ params }) => realtimeFn({ data: params.websiteId }),
  staticData: { crumb: { label: "Realtime", icon: "realtime" } },
  component: RealtimePage,
})

const toRows = (obj: Record<string, number>) =>
  Object.entries(obj)
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 6)

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
    { icon: UsersIcon, label: "Online now", value: data.active },
    { icon: EyeIcon, label: "Views (30 min)", value: data.totals.views },
    {
      icon: MousePointerClickIcon,
      label: "Events (30 min)",
      value: data.totals.events,
    },
    { icon: GlobeIcon, label: "Countries", value: data.totals.countries },
  ]

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        dither
        title="Realtime"
        description="Activity in the last 30 minutes"
        actions={
          <Pill tone="success" dot>
            Live · every 10 s
          </Pill>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <div
              key={t.label}
              className={cn(
                "min-w-0 px-5 py-4",
                i % 2 === 1 && "border-l",
                i > 1 && "border-t lg:border-t-0",
                i === 2 && "lg:border-l"
              )}
            >
              <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <t.icon className="size-4 shrink-0" strokeWidth={1.75} />
                {t.label}
              </p>
              <p className="tabular mt-3 text-2xl leading-none font-semibold tracking-tight">
                {formatNumber(t.value)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t px-5 pt-4 pb-4">
          {data.series.views.length === 0 ? (
            <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No views in the last 30 minutes
            </p>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-40 w-full"
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
                  maxBarSize={12}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Pages" description="Viewed right now">
          <TopList
            rows={toRows(data.urls)}
            renderIcon={() => <FileTextIcon />}
            renderMeta={(r) => `${r.y} views`}
            empty="No page views in the last 30 minutes"
          />
        </SectionCard>
        <SectionCard title="Referrers" description="Current traffic sources">
          <TopList
            rows={toRows(data.referrers)}
            renderIcon={() => <ShareIcon />}
            renderMeta={(r) => `${r.y} visits`}
            empty="No referrers in the last 30 minutes"
          />
        </SectionCard>
        <SectionCard title="Countries" description="Where visitors are">
          <TopList
            rows={toRows(data.countries)}
            renderIcon={(r) => flag(r.x)}
            renderLabel={(r) => countryName(r.x)}
            renderMeta={(r) => `${r.y} visitors`}
            empty="No visitors in the last 30 minutes"
          />
        </SectionCard>
      </div>

      <SectionCard title="Activity" description="Latest views and events">
        {data.events.length === 0 ? (
          <p className="flex h-32 items-center justify-center border-t text-sm text-muted-foreground">
            Waiting for activity …
          </p>
        ) : (
          <ul className="divide-y border-t">
            {data.events.slice(0, 30).map((e, i) => (
              <li
                key={`${e.createdAt}-${i}`}
                className="flex items-center gap-3 px-5 py-3 text-[13px]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep [&_svg]:size-3.5">
                  {e.eventName ? <ActivityIcon /> : <EyeIcon />}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {e.eventName ? (
                    <>
                      Triggered{" "}
                      <span className="font-semibold">{e.eventName}</span>
                    </>
                  ) : (
                    <>
                      Viewed{" "}
                      <span className="font-semibold">{e.urlPath ?? "/"}</span>
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
