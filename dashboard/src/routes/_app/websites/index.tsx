import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GlobeIcon } from "lucide-react"
import { RangeSwitch } from "@/components/app/range-switch"
import { SectionCard } from "@/components/app/section-card"
import { ChangeBadge, Sparkline } from "@/components/app/stat"
import { Badge } from "@/components/reui/badge"
import { websitesSummaryFn } from "@/lib/api"
import { formatNumber } from "@/lib/format"
import { DEFAULT_RANGE, isRange, RANGES, type RangeKey } from "@/lib/range"

export const Route = createFileRoute("/_app/websites/")({
  validateSearch: (s: Record<string, unknown>): { range?: RangeKey } =>
    isRange(s.range) ? { range: s.range } : {},
  loaderDeps: ({ search }) => ({ range: search.range ?? DEFAULT_RANGE }),
  loader: ({ deps }) => websitesSummaryFn({ data: { range: deps.range } }),
  staticData: { crumb: { label: "Websites" } },
  head: () => ({ meta: [{ title: "Websites · Umami" }] }),
  component: WebsitesPage,
})

function WebsitesPage() {
  const sites = Route.useLoaderData()
  const { range = DEFAULT_RANGE } = Route.useSearch()
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
        <div className="flex h-48 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium">No websites yet</p>
          <p className="text-sm text-muted-foreground">
            Add a website in Umami to start tracking.
          </p>
        </div>
      ) : (
        <ul className="divide-y border-t">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                to="/websites/$websiteId"
                params={{ websiteId: site.id }}
                search={{ range }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1fr)_8rem_auto_7rem]"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border bg-background dark:bg-input/30">
                  <GlobeIcon className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {site.name}
                    </span>
                    {site.active > 0 && (
                      <Badge variant="success-light" radius="full">
                        <span className="size-1.5 rounded-full bg-success" />
                        {site.active} online
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {site.domain}
                  </div>
                </div>
                <div className="hidden md:block">
                  <Sparkline
                    data={site.sessions.map((p) => p.y)}
                    color="var(--chart-1)"
                  />
                </div>
                <div className="hidden justify-end md:flex">
                  <ChangeBadge
                    current={site.stats.visitors}
                    previous={site.stats.comparison.visitors}
                  />
                </div>
                <div className="text-right">
                  <div className="tabular text-sm font-semibold">
                    {formatNumber(site.stats.visitors)}
                  </div>
                  <div className="text-xs text-muted-foreground">visitors</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
