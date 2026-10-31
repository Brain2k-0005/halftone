import { useParams } from "@tanstack/react-router"
import {
  CompassIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  type LucideIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Progress, SectionCard, Segmented } from "@/components/app/section-card"
import { Skeleton } from "@/components/app/ui-kit"
import { useApi } from "@/lib/api-client"
import type { MetricRow } from "@/lib/api"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  useSetWebsiteSearch,
  useWebsiteQuery,
  type FilterField,
} from "@/lib/website-query"

/** Id of the website the current route belongs to. */
export function useWebsiteId() {
  return (useParams({ strict: false }) as { websiteId: string }).websiteId
}

/** Returns a function that adds an `eq` filter for the clicked row to the URL. */
export function useAddFilter() {
  const set = useSetWebsiteSearch()
  return (field: FilterField, value: string) => set({ [field]: `eq.${value}` })
}

export interface Stats {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

export const bounceRate = (s: Stats) =>
  s.visits ? (Math.min(s.visits, s.bounces) / s.visits) * 100 : 0
export const visitDuration = (s: Stats) =>
  s.visits ? s.totaltime / s.visits : 0

export const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: MonitorIcon,
  laptop: MonitorIcon,
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
}

export const BrowserIcon = CompassIcon

export function Cap({ children }: { children: ReactNode }) {
  return <span className="capitalize">{children}</span>
}

export function when(iso: string) {
  return new Date(iso).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Simple tile row (label + number) for pages without a previous-period comparison. */
export function StatTiles({
  tiles,
  loading,
}: {
  tiles: {
    icon: LucideIcon
    label: string
    value: ReactNode
    hint?: ReactNode
  }[]
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2",
        tiles.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      )}
    >
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={cn(
            "min-w-0 px-5 py-4",
            i % 2 === 1 && "border-l",
            i > 1 && "border-t lg:border-t-0",
            i > 0 && "lg:border-l"
          )}
        >
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <t.icon className="size-4 shrink-0" strokeWidth={1.75} />
            {t.label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-6 w-16" />
          ) : (
            <p className="tabular mt-3 text-2xl leading-none font-semibold tracking-tight">
              {t.value}
            </p>
          )}
          {t.hint && (
            <p className="mt-2 text-xs text-muted-foreground">{t.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export interface MetricTab {
  value: string
  label: string
  /** Filter added when a row is clicked; omit for non-filterable types. */
  filter?: FilterField
  icon?: (row: MetricRow) => ReactNode
  rowLabel?: (row: MetricRow) => ReactNode
}

/** Ranked rows (like TopList) where every row can be clicked to add a filter. */
export function MetricList({
  rows,
  tab,
  unit = "visitors",
}: {
  rows: MetricRow[]
  tab: MetricTab
  unit?: string
}) {
  const add = useAddFilter()
  if (!rows.length) {
    return (
      <p className="flex h-40 items-center justify-center border-t text-sm text-muted-foreground">
        No data for this period
      </p>
    )
  }
  const max = Math.max(...rows.map((r) => r.y))
  const sum = rows.reduce((a, r) => a + r.y, 0)
  const filter = tab.filter
  return (
    <ul className="divide-y border-t">
      {rows.map((row, i) => {
        const share = sum ? (row.y / sum) * 100 : 0
        const clickable = !!filter && !!row.x
        return (
          <li key={`${row.x}-${i}`}>
            <div
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => add(filter, row.x) : undefined}
              onKeyDown={
                clickable
                  ? (e) => e.key === "Enter" && add(filter, row.x)
                  : undefined
              }
              className={cn(
                "px-5 py-3.5",
                clickable &&
                  "cursor-pointer transition-colors hover:bg-accent/40"
              )}
            >
              <div className="flex items-center gap-3">
                {tab.icon && (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm text-brand-deep [&_svg]:size-4">
                    {tab.icon(row)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-semibold"
                    title={String(row.x)}
                  >
                    {tab.rowLabel ? tab.rowLabel(row) : row.x || "(none)"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatNumber(row.y)} {unit} · {Math.round(share)} %
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
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 border-t px-5 py-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

/** Card with tabs; only the active tab is fetched from `/metrics`. */
export function MetricsCard({
  title,
  description,
  tabs,
  unit,
  limit = 6,
  className,
}: {
  title: string
  description: string
  tabs: MetricTab[]
  unit?: string
  limit?: number
  className?: string
}) {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [value, setValue] = useState(tabs[0]!.value)
  const tab = tabs.find((t) => t.value === value)!
  const { data, error } = useApi<MetricRow[]>(
    `/websites/${websiteId}/metrics`,
    {
      ...query,
      type: tab.value,
      limit,
    }
  )

  return (
    <SectionCard
      title={title}
      description={description}
      className={className}
      actions={
        tabs.length > 1 && (
          <Segmented value={value} options={tabs} onChange={setValue} />
        )
      }
    >
      {error ? (
        <p className="border-t px-5 py-10 text-center text-sm text-destructive">
          {error.message}
        </p>
      ) : !data ? (
        <ListSkeleton />
      ) : (
        <MetricList rows={data} tab={tab} unit={unit} />
      )}
    </SectionCard>
  )
}
