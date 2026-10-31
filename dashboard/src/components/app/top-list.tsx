import type { ReactNode } from "react"
import { Progress } from "@/components/app/section-card"
import type { MetricRow } from "@/lib/api"
import { formatNumber } from "@/lib/format"

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

/** Ranked rows with a progress bar underneath, like "Top events by revenue". */
export function TopList({
  rows,
  renderLabel,
  renderIcon,
  renderMeta,
  empty = "No data for this period",
}: {
  rows: MetricRow[]
  renderLabel?: (row: MetricRow) => ReactNode
  renderIcon?: (row: MetricRow) => ReactNode
  renderMeta?: (row: MetricRow, share: number) => ReactNode
  empty?: string
}) {
  if (!rows.length) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {empty}
      </p>
    )
  }

  const max = Math.max(...rows.map((r) => r.y))
  const sum = rows.reduce((acc, r) => acc + r.y, 0)

  return (
    <ul className="divide-y border-t">
      {rows.map((row, i) => {
        const share = sum ? (row.y / sum) * 100 : 0
        return (
          <li key={`${row.x}-${i}`} className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              {renderIcon && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm text-brand-deep [&_svg]:size-4">
                  {renderIcon(row)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-semibold"
                  title={String(row.x)}
                >
                  {renderLabel ? renderLabel(row) : row.x || "(none)"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {renderMeta
                    ? renderMeta(row, share)
                    : `${Math.round(share)} % of the top ${rows.length}`}
                </p>
              </div>
              <span className="tabular text-[13px] font-semibold">
                {formatNumber(row.y)}
              </span>
            </div>
            <Progress
              className="mt-3"
              percent={max ? (row.y / max) * 100 : 0}
            />
          </li>
        )
      })}
    </ul>
  )
}
