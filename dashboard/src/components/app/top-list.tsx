import type { ReactNode } from "react"
import { formatNumber } from "@/lib/format"
import type { MetricRow } from "@/lib/api"
import { cn } from "@/lib/utils"

const regionNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null

export function countryName(code: string) {
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

export function flag(code: string) {
  if (!/^[A-Z]{2}$/i.test(code)) return "🏳️"
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))
  )
}

/** Ranked rows with a proportional bar underneath, like ReUI's "Top events" list. */
export function TopList({
  rows,
  total,
  renderLabel,
  renderIcon,
  empty = "No data for this period",
}: {
  rows: MetricRow[]
  total?: number
  renderLabel?: (row: MetricRow) => ReactNode
  renderIcon?: (row: MetricRow) => ReactNode
  empty?: string
}) {
  if (!rows.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {empty}
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.y))
  const sum = total ?? rows.reduce((acc, r) => acc + r.y, 0)

  return (
    <ul className="divide-y">
      {rows.map((row, i) => (
        <li key={`${row.x}-${i}`} className="px-5 py-2.5">
          <div className="flex items-center gap-3">
            {renderIcon && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-sm dark:bg-input/30 [&_svg]:size-3.5">
                {renderIcon(row)}
              </span>
            )}
            <span
              className="min-w-0 flex-1 truncate text-sm font-medium"
              title={String(row.x)}
            >
              {renderLabel ? renderLabel(row) : row.x || "(none)"}
            </span>
            <span className="tabular text-sm font-semibold">
              {formatNumber(row.y)}
            </span>
            <span className="tabular w-10 text-right text-xs text-muted-foreground">
              {sum ? Math.round((row.y / sum) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-chart-1",
                i > 0 && "opacity-80"
              )}
              style={{ width: `${max ? (row.y / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
