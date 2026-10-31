import { ArrowDownRightIcon } from "lucide-react"
import { Pill } from "@/components/app/section-card"
import { formatNumber } from "@/lib/format"

export interface FunnelStep {
  type: string
  value: string
  visitors: number
  previous: number
  dropped: number
  dropoff: number | null
  remaining: number
}

/** Step bars: width = share of the first step, with conversion from the previous step and drop-off. */
export function FunnelSteps({ steps }: { steps: FunnelStep[] }) {
  const first = steps[0]?.visitors ?? 0
  return (
    <ol className="divide-y border-t">
      {steps.map((step, i) => {
        const width = first ? (step.visitors / first) * 100 : 0
        return (
          <li key={`${i}-${step.value}`} className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-xs font-semibold text-brand-deep">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-semibold"
                  title={step.value}
                >
                  {step.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.type === "event" ? "Event" : "Page view"}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-[13px] font-semibold">
                  {formatNumber(step.visitors)}
                </p>
                <p className="tabular text-xs text-muted-foreground">
                  {width.toFixed(1)}% of start
                </p>
              </div>
            </div>
            <div className="mt-3 h-8 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full rounded-md bg-brand transition-[width]"
                style={{
                  width: `${Math.max(width, step.visitors ? 1 : 0)}%`,
                  opacity: Math.max(0.4, 1 - i * 0.1),
                }}
              />
            </div>
            {i > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Pill
                  tone="success"
                  className="tabular px-1.5 py-px text-[11px]"
                >
                  {((step.remaining ?? 0) * 100).toFixed(1)}% continued
                </Pill>
                <span className="tabular inline-flex items-center gap-1">
                  <ArrowDownRightIcon className="size-3.5" />
                  {formatNumber(step.dropped)} dropped off (
                  {((step.dropoff ?? 0) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
