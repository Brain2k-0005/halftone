import { createFileRoute } from "@tanstack/react-router"
import { LayersIcon } from "lucide-react"
import { useState } from "react"
import { SectionCard } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import { DataTable, EmptyState, type Column } from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { useWebsiteId } from "@/components/traffic/shared"
import { useApi } from "@/lib/api-client"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { FILTER_FIELDS, useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/breakdown")({
  staticData: { crumb: { label: "Breakdown", icon: "website" } },
  component: BreakdownPage,
})

type Row = Record<string, string | number | null> & {
  views: number | string
  visitors: number
  visits: number
  bounces: number
  totaltime: number | string
}

// The original excludes "event" from the groupable fields.
const FIELDS = FILTER_FIELDS.filter((f) => f.key !== "event")

function cell(field: string, value: string | number | null) {
  if (value === null || value === "")
    return <span className="text-muted-foreground">(none)</span>
  if (field === "country")
    return `${flag(String(value))} ${countryName(String(value))}`
  return String(value)
}

function BreakdownPage() {
  const websiteId = useWebsiteId()
  const { query } = useWebsiteQuery()
  const [selected, setSelected] = useState<string[]>(["path"])

  const { data, isLoading, error } = useApi<Row[]>(
    selected.length ? `/websites/${websiteId}/breakdown` : null,
    { ...query, fields: JSON.stringify(selected) },
    { placeholderData: (prev) => prev }
  )

  const toggle = (key: string) =>
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    )

  const columns: Column<Row>[] = [
    ...selected.map<Column<Row>>((field) => ({
      key: field,
      header: FIELDS.find((f) => f.key === field)?.label ?? field,
      cell: (r) => (
        <span
          className="block max-w-72 truncate font-medium"
          title={String(r[field] ?? "")}
        >
          {cell(field, r[field] ?? null)}
        </span>
      ),
    })),
    {
      key: "visitors",
      header: "Visitors",
      align: "right",
      cell: (r) => formatNumber(r.visitors),
    },
    {
      key: "visits",
      header: "Visits",
      align: "right",
      cell: (r) => formatNumber(r.visits),
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      cell: (r) => formatNumber(Number(r.views)),
    },
    {
      key: "bounce",
      header: "Bounce rate",
      align: "right",
      cell: (r) =>
        formatPercent(
          r.visits ? (Math.min(r.visits, r.bounces) / r.visits) * 100 : 0
        ),
    },
    {
      key: "duration",
      header: "Visit duration",
      align: "right",
      cell: (r) =>
        formatDuration(r.visits ? Number(r.totaltime) / r.visits : 0),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <WebsiteToolbar />

      <SectionCard
        dither
        title="Breakdown"
        description="Group traffic by one or more fields"
      >
        <div className="flex flex-wrap gap-2 border-t px-5 py-4">
          {FIELDS.map((f) => {
            const on = selected.includes(f.key)
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(f.key)}
                className={cn(
                  "h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                  on
                    ? "border-transparent bg-brand-soft text-brand-deep"
                    : "bg-card text-muted-foreground shadow-xs hover:bg-accent hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Results"
        description={
          selected.length
            ? `Grouped by ${selected.length} ${selected.length === 1 ? "field" : "fields"}`
            : undefined
        }
      >
        {selected.length === 0 ? (
          <div className="border-t">
            <EmptyState
              icon={LayersIcon}
              title="Pick a field"
              description="Select at least one field above to group the traffic."
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(r) => selected.map((f) => String(r[f])).join("|")}
            isLoading={isLoading}
            error={error}
            empty={
              <EmptyState
                icon={LayersIcon}
                title="No data"
                description="Nothing matches this period and filters."
              />
            }
          />
        )}
      </SectionCard>
    </div>
  )
}
