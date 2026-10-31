import type { ReactNode } from "react"
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts"
import { Badge } from "@/components/reui/badge"
import { formatChange, percentChange } from "@/lib/format"
import { cn } from "@/lib/utils"

export function Sparkline({
  data,
  color = "var(--chart-3)",
}: {
  data: number[]
  color?: string
}) {
  if (data.length < 2) return null
  return (
    <div className="h-10 w-28 shrink-0" aria-hidden>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 112, height: 40 }}
      >
        <LineChart
          data={data.map((y, i) => ({ i, y }))}
          margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
        >
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChangeBadge({
  current,
  previous,
  invert = false,
}: {
  current: number
  previous: number
  invert?: boolean
}) {
  const change = percentChange(current, previous)

  if (change === null) {
    return (
      <Badge variant="outline" radius="full" className="tabular">
        new
      </Badge>
    )
  }

  const good = invert ? change < 0 : change > 0
  const variant =
    change === 0 ? "outline" : good ? "success-light" : "destructive-light"

  return (
    <Badge variant={variant} radius="full" className="tabular">
      {formatChange(change)}
    </Badge>
  )
}

export function changeText(current: number, previous: number) {
  const change = percentChange(current, previous)
  if (change === null) return "No previous data"
  if (change === 0) return "Same as previous period"
  return change > 0 ? "Above previous period" : "Below previous period"
}

/** One cell of the Overview card: icon label, big number, sparkline and period delta. */
export function Stat({
  icon,
  label,
  value,
  current,
  previous,
  invert,
  spark,
  sparkColor,
  className,
}: {
  icon: ReactNode
  label: string
  value: string
  current: number
  previous: number
  invert?: boolean
  spark?: number[]
  sparkColor?: string
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 px-5 py-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="tabular text-2xl leading-8 font-semibold tracking-tight">
          {value}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor} />}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ChangeBadge current={current} previous={previous} invert={invert} />
        <span className="truncate">{changeText(current, previous)}</span>
      </div>
    </div>
  )
}
