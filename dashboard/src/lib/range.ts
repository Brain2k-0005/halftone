export const RANGES = {
  "24h": {
    label: "24h",
    long: "the last 24 hours",
    unit: "hour",
    ms: 24 * 3600_000,
  },
  "7d": {
    label: "Week",
    long: "the last 7 days",
    unit: "day",
    ms: 7 * 86400_000,
  },
  "30d": {
    label: "Month",
    long: "the last 30 days",
    unit: "day",
    ms: 30 * 86400_000,
  },
  "90d": {
    label: "90 D",
    long: "the last 90 days",
    unit: "day",
    ms: 90 * 86400_000,
  },
  "12m": {
    label: "Year",
    long: "the last 12 months",
    unit: "month",
    ms: 365 * 86400_000,
  },
} as const

export type RangeKey = keyof typeof RANGES

export const DEFAULT_RANGE: RangeKey = "30d"

export function isRange(value: unknown): value is RangeKey {
  return typeof value === "string" && value in RANGES
}

export function resolveRange(key: RangeKey, now = Date.now()) {
  const { ms, unit } = RANGES[key]
  // Snap to the hour so repeated loads share a cache key.
  const endAt = Math.ceil(now / 3600_000) * 3600_000
  return { startAt: endAt - ms, endAt, unit }
}
