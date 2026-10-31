import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Point } from "@/lib/api"
import { formatAxis } from "@/lib/format"
import { cn } from "@/lib/utils"

const config = {
  visitors: { label: "Visitors", color: "var(--chart-1)" },
  views: { label: "Views", color: "var(--chart-2)" },
} satisfies ChartConfig

export type ChartMode = "both" | "visitors" | "views"

function formatTick(value: string, unit: string) {
  const d = new Date(value)
  if (unit === "hour") return d.toLocaleTimeString("en", { hour: "numeric" })
  if (unit === "month") return d.toLocaleDateString("en", { month: "short" })
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
}

export function TrafficChart({
  pageviews,
  sessions,
  unit,
  mode,
  className,
}: {
  pageviews: Point[]
  sessions: Point[]
  unit: string
  mode: ChartMode
  className?: string
}) {
  const byDate = new Map(sessions.map((p) => [p.x, p.y]))
  const data = pageviews.map((p) => ({
    date: p.x,
    views: p.y,
    visitors: byDate.get(p.x) ?? 0,
  }))

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-72 w-full", className)}
    >
      <BarChart data={data} margin={{ left: -12, right: 4, top: 8 }} barGap={2}>
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
          width={48}
          tickFormatter={formatAxis}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const raw = payload?.[0]?.payload?.date
                return raw
                  ? new Date(raw).toLocaleString(
                      "en",
                      unit === "hour"
                        ? { dateStyle: "medium", timeStyle: "short" }
                        : { dateStyle: "medium" }
                    )
                  : ""
              }}
            />
          }
        />
        {mode !== "views" && (
          <Bar
            dataKey="visitors"
            fill="var(--color-visitors)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
        )}
        {mode !== "visitors" && (
          <Bar
            dataKey="views"
            fill="var(--color-views)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
        )}
      </BarChart>
    </ChartContainer>
  )
}
