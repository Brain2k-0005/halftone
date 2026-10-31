import { useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo } from "react"
import { defaultRange } from "@/lib/default-range"
import { isRange, resolveRange, type RangeKey } from "@/lib/range"

/*
 * Shared date range + filter state for every website page. It lives in the URL search params
 * (validated once on the /websites/$websiteId layout route), so links, reloads and the back button keep it.
 *
 *   ?range=30d                      preset (see lib/range.ts)
 *   ?startAt=…&endAt=…              custom range (ms timestamps), wins over `range`
 *   ?compare=prev|yoy               comparison period for compare views
 *   ?path=eq./blog&country=eq.US    Umami filters: `<operator>.<value>`
 */

export const FILTER_FIELDS = [
  { key: "path", label: "Path" },
  { key: "title", label: "Page title" },
  { key: "query", label: "Query" },
  { key: "referrer", label: "Referrer" },
  { key: "hostname", label: "Hostname" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "OS" },
  { key: "device", label: "Device" },
  { key: "country", label: "Country" },
  { key: "region", label: "Region" },
  { key: "city", label: "City" },
  { key: "language", label: "Language" },
  { key: "event", label: "Event" },
  { key: "tag", label: "Tag" },
  { key: "distinctId", label: "Distinct ID" },
  { key: "utmSource", label: "UTM source" },
  { key: "utmMedium", label: "UTM medium" },
  { key: "utmCampaign", label: "UTM campaign" },
  { key: "utmContent", label: "UTM content" },
  { key: "utmTerm", label: "UTM term" },
] as const

export type FilterField = (typeof FILTER_FIELDS)[number]["key"]

export const OPERATORS = [
  { key: "eq", label: "is" },
  { key: "neq", label: "is not" },
  { key: "c", label: "contains" },
  { key: "dnc", label: "does not contain" },
] as const

export type Operator = (typeof OPERATORS)[number]["key"]

export interface WebsiteSearch {
  range?: RangeKey
  startAt?: number
  endAt?: number
  compare?: "prev" | "yoy"
  segment?: string
  cohort?: string
  filters?: Partial<Record<FilterField, string>>
}

const FILTER_KEYS = new Set<string>(FILTER_FIELDS.map((f) => f.key))

/** validateSearch for the website layout route. Filters are flattened into the URL (`?path=eq./blog`). */
export function validateWebsiteSearch(
  s: Record<string, unknown>
): WebsiteSearch & Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (isRange(s.range)) out.range = s.range
  const startAt = Number(s.startAt)
  const endAt = Number(s.endAt)
  if (startAt > 0 && endAt > startAt) {
    out.startAt = startAt
    out.endAt = endAt
  }
  if (s.compare === "prev" || s.compare === "yoy") out.compare = s.compare
  if (typeof s.segment === "string") out.segment = s.segment
  if (typeof s.cohort === "string") out.cohort = s.cohort
  for (const [k, v] of Object.entries(s)) {
    if (FILTER_KEYS.has(k) && typeof v === "string" && v) out[k] = v
  }
  return out as WebsiteSearch & Record<string, unknown>
}

function unitFor(ms: number) {
  if (ms <= 2 * 86400_000) return "hour"
  if (ms <= 180 * 86400_000) return "day"
  return "month"
}

export const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone

/** Resolves the URL state into the query every Umami analytics endpoint understands. */
export function resolveWebsiteQuery(
  search: Record<string, unknown>,
  timezone = browserTimezone()
) {
  const range = isRange(search.range) ? search.range : defaultRange()
  const custom =
    typeof search.startAt === "number" && typeof search.endAt === "number"
  const { startAt, endAt, unit } = custom
    ? {
        startAt: search.startAt as number,
        endAt: search.endAt as number,
        unit: unitFor((search.endAt as number) - (search.startAt as number)),
      }
    : resolveRange(range)

  const filters: Record<string, string> = {}
  for (const f of FILTER_FIELDS) {
    const v = search[f.key]
    if (typeof v === "string" && v) filters[f.key] = v
  }
  if (typeof search.segment === "string") filters.segment = search.segment
  if (typeof search.cohort === "string") filters.cohort = search.cohort

  return {
    range,
    custom,
    filters,
    /** Spread this into `useApi(path, query)` for analytics endpoints. */
    query: { startAt, endAt, unit, timezone, ...filters },
    dates: { startAt, endAt, unit, timezone },
  }
}

/** Hook version for components below /websites/$websiteId. */
export function useWebsiteQuery() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  return useMemo(() => resolveWebsiteQuery(search), [search])
}

/** Update the website URL state (keeps everything not mentioned). */
export function useSetWebsiteSearch() {
  const navigate = useNavigate()
  return (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch }
        for (const k of Object.keys(next))
          if (next[k] === undefined || next[k] === "") delete next[k]
        return next
      },
    } as never)
}

export function parseFilter(value: string): {
  operator: Operator
  value: string
} {
  const m = /^(eq|neq|c|dnc)\.(.*)$/.exec(value)
  return m
    ? { operator: m[1] as Operator, value: m[2]! }
    : { operator: "eq", value }
}
