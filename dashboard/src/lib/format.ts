const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const plain = new Intl.NumberFormat("en")

export function formatNumber(n: number) {
  return Math.abs(n) >= 10_000 ? compact.format(n) : plain.format(Math.round(n))
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m}m ${s}s` : `${s}s`
}

export function formatPercent(n: number) {
  return `${Math.round(n)}%`
}

/** Relative change in percent; `null` when there is nothing to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return current ? null : 0
  return ((current - previous) / previous) * 100
}

export function formatChange(change: number) {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±"
  return `${sign}${Math.abs(change).toFixed(1)} %`
}

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/** Compact axis ticks so 4-digit values fit narrow chart axes (1600 → "1.6K"). */
export function formatAxis(value: number) {
  if (Math.abs(value) >= 1_000_000)
    return `${Number((value / 1_000_000).toFixed(1))}M`
  if (Math.abs(value) >= 1000) return `${Number((value / 1000).toFixed(1))}K`
  return String(value)
}
