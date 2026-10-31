import type { LucideIcon } from "lucide-react"
import { DeltaPill, Sparkline } from "@/components/app/section-card"
import { percentChange } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface StatColumn {
  key: string
  icon: LucideIcon
  label: string
  value: string
  current: number
  previous: number
  /** Lower is better (bounce rate). */
  invert?: boolean
  spark?: number[]
}

export function changeText(current: number, previous: number) {
  const change = percentChange(current, previous)
  if (change === null) return "No previous data"
  if (change === 0) return "Same as previous period"
  return change > 0 ? "Above previous period" : "Below previous period"
}

/** The columns of an overview card ("Performance Overview" in ReUI): one card, dividers between columns. */
export function StatGrid({ columns }: { columns: StatColumn[] }) {
  const five = columns.length >= 5
  return (
    <div
      className={cn(
        "grid sm:grid-cols-2",
        five ? "xl:grid-cols-5" : "xl:grid-cols-4"
      )}
    >
      {columns.map((c, i) => {
        const change = percentChange(c.current, c.previous)
        const down = change !== null && (c.invert ? change > 0 : change < 0)
        return (
          <div
            key={c.key}
            className={cn(
              "min-w-0 px-5 py-4",
              i > 0 && "border-t sm:border-t-0",
              i % 2 === 1 && "sm:border-l",
              i > 1 && "sm:border-t xl:border-t-0",
              i > 0 && "xl:border-l"
            )}
          >
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <c.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {c.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="tabular text-2xl leading-none font-semibold tracking-tight whitespace-nowrap">
                {c.value}
              </p>
              {c.spark && c.spark.length > 1 && (
                <Sparkline
                  className="w-20"
                  values={c.spark}
                  tone={down ? "warning" : "success"}
                />
              )}
            </div>
            <div className="mt-3 flex min-h-5 items-center gap-2 text-xs">
              {change !== null && (
                <DeltaPill value={change} invert={c.invert} />
              )}
              <span className="truncate text-muted-foreground">
                {changeText(c.current, c.previous)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
