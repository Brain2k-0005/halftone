import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  EyeIcon,
  GlobeIcon,
  MousePointerClickIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"
import { useState } from "react"
import { SectionCard } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import {
  DataTable,
  EmptyState,
  Pagination,
  Skeleton,
  type Column,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { Cap, StatTiles, useWebsiteId, when } from "@/components/traffic/shared"
import { useApi, type Paged } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/sessions/")({
  staticData: { crumb: { label: "Sessions", icon: "website" } },
  component: SessionsPage,
})

interface SessionRow {
  id: string
  browser: string
  os: string
  device: string
  country: string | null
  city: string | null
  firstAt: string
  lastAt: string
  visits: number
  views: number
  events: number
}

interface SessionStats {
  pageviews: { value: number }
  visitors: { value: number }
  visits: { value: number }
  countries: { value: number }
  events: { value: number }
}

function SessionsPage() {
  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar />
      <SessionsOverview />
      <SessionsTable />
    </div>
  )
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function SessionsOverview() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const stats = useApi<SessionStats>(
    `/websites/${websiteId}/sessions/stats`,
    query
  )
  const weekly = useApi<number[][]>(
    `/websites/${websiteId}/sessions/weekly`,
    query
  )
  const s = stats.data
  const max = Math.max(1, ...(weekly.data ?? []).flat())

  return (
    <SectionCard
      dither
      title="Sessions"
      description="Who visited, when, and how often"
    >
      <StatTiles
        loading={!s}
        tiles={[
          {
            icon: UsersIcon,
            label: "Visitors",
            value: formatNumber(s?.visitors.value ?? 0),
          },
          {
            icon: MousePointerClickIcon,
            label: "Visits",
            value: formatNumber(s?.visits.value ?? 0),
          },
          {
            icon: EyeIcon,
            label: "Views",
            value: formatNumber(s?.pageviews.value ?? 0),
          },
          {
            icon: GlobeIcon,
            label: "Countries",
            value: formatNumber(s?.countries.value ?? 0),
          },
        ]}
      />
      <div className="border-t px-5 pt-4 pb-5">
        <p className="mb-3 text-[13px] font-medium">Weekly traffic</p>
        {weekly.error ? (
          <p className="py-6 text-center text-sm text-destructive">
            {weekly.error.message}
          </p>
        ) : !weekly.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 text-[11px] text-muted-foreground">
              <span />
              {HOURS.map((h) => (
                <span key={h} className="text-center">
                  {h % 3 === 0 ? h : ""}
                </span>
              ))}
              {DAYS.map((day, d) => (
                <div key={day} className="contents">
                  <span className="flex items-center">{day}</span>
                  {HOURS.map((h) => {
                    const v = weekly.data[d]?.[h] ?? 0
                    return (
                      <span
                        key={h}
                        title={`${day} ${String(h).padStart(2, "0")}:00 · ${v} visitors`}
                        className={cn(
                          "h-6 rounded-[4px]",
                          v === 0 && "bg-muted"
                        )}
                        style={
                          v > 0
                            ? {
                                background: `color-mix(in oklab, var(--brand) ${Math.round(12 + (v / max) * 88)}%, transparent)`,
                              }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function SessionsTable() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const { data, isLoading, error } = useApi<Paged<SessionRow>>(
    `/websites/${websiteId}/sessions`,
    { ...query, page, pageSize: 20, search },
    { placeholderData: (prev) => prev }
  )

  const columns: Column<SessionRow>[] = [
    {
      key: "visitor",
      header: "Visitor",
      cell: (s) => (
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold text-brand-deep">
            {s.id.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium">{s.id.slice(0, 8)}</span>
        </span>
      ),
    },
    {
      key: "country",
      header: "Location",
      cell: (s) =>
        s.country ? (
          <span className="whitespace-nowrap">
            {flag(s.country)} {countryName(s.country)}
            {s.city && (
              <span className="text-muted-foreground"> · {s.city}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "env",
      header: "Environment",
      cell: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">
          <Cap>{s.browser}</Cap> · {s.os} · <Cap>{s.device}</Cap>
        </span>
      ),
    },
    {
      key: "visits",
      header: "Visits",
      align: "right",
      cell: (s) => formatNumber(s.visits),
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      cell: (s) => formatNumber(s.views),
    },
    {
      key: "last",
      header: "Last seen",
      align: "right",
      cell: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {when(s.lastAt)}
        </span>
      ),
    },
  ]

  return (
    <SectionCard
      title="Visitors"
      description="Every session in the selected period"
    >
      <div className="px-5 pb-3">
        <label className="relative block max-w-xs">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search sessions"
            className="h-8 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        error={error}
        onRowClick={(s) =>
          navigate({
            to: "/websites/$websiteId/sessions/$sessionId",
            params: { websiteId, sessionId: s.id },
            search: (prev: Record<string, unknown>) => prev,
          } as never)
        }
        empty={
          <EmptyState
            icon={UsersIcon}
            title="No sessions"
            description="Nothing matches this period and filters."
          />
        }
      />
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          count={data.count}
          onPage={setPage}
        />
      )}
    </SectionCard>
  )
}
