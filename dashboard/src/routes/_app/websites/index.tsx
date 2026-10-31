import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GlobeIcon } from "lucide-react"
import { RangeSwitch } from "@/components/app/range-switch"
import {
  DeltaPill,
  Pill,
  SectionCard,
  Sparkline,
} from "@/components/app/section-card"
import { defaultRange } from "@/lib/default-range"
import { websitesSummaryFn } from "@/lib/api"
import { formatNumber, percentChange } from "@/lib/format"
import { isRange, RANGES, type RangeKey } from "@/lib/range"

export const Route = createFileRoute("/_app/websites/")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? defaultRange() }),
  loader: ({ deps }) => websitesSummaryFn({ data: { range: deps.range } }),
  staticData: { crumb: { label: "Websites", icon: "websites" } },
  head: () => ({ meta: [{ title: "Websites · Halftone" }] }),
  component: WebsitesPage,
})

function WebsitesPage() {
  const sites = Route.useLoaderData()
  const range = Route.useSearch().range ?? defaultRange()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <SectionCard
      title="Websites"
      description={`${sites.length} tracked ${sites.length === 1 ? "website" : "websites"} · visitors in ${RANGES[range].long}`}
      actions={
        <RangeSwitch
          value={range}
          onChange={(r) => navigate({ search: { range: r } })}
        />
      }
    >
      {sites.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-1 border-t text-center">
          <p className="text-sm font-medium">No websites yet</p>
          <p className="text-sm text-muted-foreground">
            Add a website in Umami to start tracking.
          </p>
        </div>
      ) : (
        <ul className="divide-y border-t">
          {sites.map((site) => {
            const change = percentChange(
              site.stats.visitors,
              site.stats.comparison.visitors
            )
            return (
              <li key={site.id}>
                <Link
                  to="/websites/$websiteId"
                  params={{ websiteId: site.id }}
                  search={{ range }}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40 md:grid-cols-[auto_minmax(0,1fr)_6rem_5.5rem_6rem]"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
                    <GlobeIcon className="size-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold">
                        {site.name}
                      </p>
                      {site.active > 0 && (
                        <Pill
                          tone="success"
                          dot
                          className="px-1.5 py-px text-[11px]"
                        >
                          {site.active} online
                        </Pill>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {site.domain}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <Sparkline
                      values={site.sessions.map((p) => p.y)}
                      tone={
                        change !== null && change < 0 ? "warning" : "success"
                      }
                    />
                  </div>
                  <div className="hidden justify-end md:flex">
                    {change !== null && <DeltaPill value={change} />}
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[13px] font-semibold">
                      {formatNumber(site.stats.visitors)}
                    </p>
                    <p className="text-xs text-muted-foreground">visitors</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
