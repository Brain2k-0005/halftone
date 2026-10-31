import { createFileRoute } from "@tanstack/react-router"
import { UsersIcon } from "lucide-react"
import { useMemo } from "react"
import { SectionCard } from "@/components/app/section-card"
import {
  EmptyState,
  ErrorText,
  LoadingRows,
  PageHeader,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/retention")({
  staticData: { crumb: { label: "Retention", icon: "website" } },
  component: RetentionPage,
})

const DAYS = [1, 2, 3, 4, 5, 6, 7, 14, 21, 28]

interface RetentionRow {
  date: string
  day: number
  visitors: number
  returnVisitors: number
  percentage: number
}

interface Cohort {
  date: string
  visitors: number
  cells: Map<number, RetentionRow>
}

function shade(percentage: number) {
  // 0-100 % mapped to 6-85 % brand mix; text flips to white on dark cells.
  const mix = 6 + Math.min(100, percentage) * 0.8
  return {
    backgroundColor: `color-mix(in oklab, var(--brand) ${mix.toFixed(0)}%, transparent)`,
    color: mix > 45 ? "white" : undefined,
  }
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

function RetentionPage() {
  const { websiteId } = Route.useParams()
  const { query } = useWebsiteQuery()
  const { data, isLoading, error } = useApi<RetentionRow[]>(
    `/websites/${websiteId}/retention`,
    query
  )

  const { cohorts, average } = useMemo(() => {
    const map = new Map<string, Cohort>()
    for (const row of data ?? []) {
      const cohort = map.get(row.date) ?? {
        date: row.date,
        visitors: 0,
        cells: new Map(),
      }
      if (row.day === 0) cohort.visitors = row.visitors
      else cohort.cells.set(row.day, row)
      map.set(row.date, cohort)
    }
    const cohorts = [...map.values()]
      .filter((c) => c.visitors > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
    // Weighted average over the cohorts that have data for that day.
    const average = DAYS.map((day) => {
      let base = 0
      let returned = 0
      for (const c of cohorts) {
        const cell = c.cells.get(day)
        if (cell) {
          base += cell.visitors
          returned += cell.returnVisitors
        }
      }
      return base ? (returned / base) * 100 : null
    })
    return { cohorts, average }
  }, [data])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Retention"
        description="How many visitors come back on the days after their first visit."
      />
      <WebsiteToolbar />
      <SectionCard
        title="Cohort retention"
        description="Each row is the group of visitors who first arrived that day."
      >
        {error ? (
          <ErrorText error={error} className="border-t" />
        ) : isLoading ? (
          <LoadingRows rows={8} />
        ) : !cohorts.length ? (
          <div className="border-t">
            <EmptyState
              icon={UsersIcon}
              title="No retention data"
              description="There are no visitors in this date range."
            />
          </div>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="h-9 px-5 text-left text-xs font-medium text-muted-foreground">
                    Cohort
                  </th>
                  <th className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">
                    Visitors
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d}
                      className="h-9 px-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      Day {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.date}>
                    <td className="h-10 border-t px-5 whitespace-nowrap">
                      {formatDay(c.date)}
                    </td>
                    <td className="tabular h-10 border-t px-3 text-right">
                      {formatNumber(c.visitors)}
                    </td>
                    {DAYS.map((d) => {
                      const cell = c.cells.get(d)
                      return (
                        <td key={d} className="h-10 border-t p-0.5">
                          {cell && (
                            <div
                              className="tabular flex h-full items-center justify-center rounded-md text-xs font-medium"
                              style={shade(cell.percentage)}
                              title={`${formatNumber(cell.returnVisitors)} of ${formatNumber(cell.visitors)} visitors returned`}
                            >
                              {cell.percentage.toFixed(
                                cell.percentage >= 10 ? 0 : 1
                              )}
                              %
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="h-10 border-t px-5 text-xs font-semibold">
                    Average
                  </td>
                  <td className="border-t" />
                  {average.map((v, i) => (
                    <td
                      key={DAYS[i]}
                      className="tabular h-10 border-t text-center text-xs font-semibold"
                    >
                      {v === null ? "" : `${v.toFixed(v >= 10 ? 0 : 1)}%`}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
