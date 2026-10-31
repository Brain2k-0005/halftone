import { createFileRoute, Link } from "@tanstack/react-router"
import { FlameIcon, SearchIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { SectionCard, Segmented } from "@/components/app/section-card"
import {
  EmptyState,
  ErrorText,
  LoadingRows,
  PageHeader,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import {
  ClickHeatmap,
  ScrollHeatmap,
  type HeatmapResult,
} from "@/components/behavior/heatmap-view"
import { useWebsiteInfo } from "@/components/behavior/website-info"
import { useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app/websites/$websiteId/heatmaps")({
  staticData: { crumb: { label: "Heatmaps", icon: "website" } },
  component: HeatmapsPage,
})

type Mode = "click" | "scroll"

function HeatmapsPage() {
  const { websiteId } = Route.useParams()
  const { query } = useWebsiteQuery()
  const [mode, setMode] = useState<Mode>("click")
  const [search, setSearch] = useState("")
  const [urlPaths, setUrlPaths] = useState<Record<Mode, string>>({
    click: "",
    scroll: "",
  })
  const urlPath = urlPaths[mode]
  const { data: website, isLoading: websiteLoading } = useWebsiteInfo(websiteId)

  const list = useApi<HeatmapResult>(`/websites/${websiteId}/heatmaps`, {
    ...query,
    mode,
  })
  const detail = useApi<HeatmapResult>(
    urlPath ? `/websites/${websiteId}/heatmaps` : null,
    { ...query, mode, urlPath },
    { placeholderData: (prev) => prev }
  )

  const pages = useMemo(() => {
    const all = list.data?.pages ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((p) => p.urlPath.toLowerCase().includes(q)) : all
  }, [list.data, search])

  // Select the first page automatically, and fall back when the selected one disappears (filters, mode).
  useEffect(() => {
    if (list.isLoading) return
    if (!pages.length) {
      if (urlPath) setUrlPaths((s) => ({ ...s, [mode]: "" }))
      return
    }
    if (!urlPath || !pages.some((p) => p.urlPath === urlPath)) {
      setUrlPaths((s) => ({ ...s, [mode]: pages[0]!.urlPath }))
    }
  }, [pages, list.isLoading, urlPath, mode])

  const heatmapOff =
    !websiteLoading &&
    !!website &&
    website.replayConfig?.heatmapEnabled !== true
  const noPages =
    !list.isLoading && !list.error && (list.data?.pages.length ?? 0) === 0
  const detailLoading =
    !!urlPath &&
    (detail.isLoading || (detail.isFetching && detail.data?.mode !== mode))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Heatmaps"
        description="See where visitors click and how far they scroll on each page."
      />
      <WebsiteToolbar />
      <SectionCard
        dither
        title="Page heatmap"
        description={urlPath || undefined}
        actions={
          <Segmented
            value={mode}
            options={[
              { value: "click", label: "Clicks" },
              { value: "scroll", label: "Scroll" },
            ]}
            onChange={setMode}
          />
        }
      >
        {list.error ? (
          <ErrorText error={list.error} className="border-t" />
        ) : noPages && !search ? (
          <div className="border-t">
            <EmptyState
              icon={FlameIcon}
              title={
                heatmapOff ? "Heatmaps are turned off" : "No heatmap data yet"
              }
              description={
                heatmapOff
                  ? "Enable heatmaps in the website settings and add the recorder script to your site to collect click and scroll data."
                  : "Once visitors interact with recorded pages in this period, they show up here."
              }
              action={
                heatmapOff ? (
                  <Link
                    to="/websites/$websiteId/settings"
                    params={{ websiteId }}
                    search={{ tab: "recording" } as never}
                    className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                  >
                    Open recording settings
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid border-t lg:grid-cols-[18rem_1fr]">
            <div className="flex min-w-0 flex-col border-b lg:border-r lg:border-b-0">
              <div className="relative p-3">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-5.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages"
                  className="h-8 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="max-h-[36rem] min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {list.isLoading ? (
                  <LoadingRows rows={4} />
                ) : pages.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                    No matching pages
                  </p>
                ) : (
                  pages.map((p) => (
                    <button
                      key={p.urlPath}
                      type="button"
                      title={`${formatNumber(p.sessions)} visitors · ${formatNumber(p.count)} ${mode === "click" ? "clicks" : "scroll events"}`}
                      onClick={() =>
                        setUrlPaths((s) => ({ ...s, [mode]: p.urlPath }))
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60",
                        p.urlPath === urlPath && "bg-accent font-medium"
                      )}
                    >
                      <span className="truncate">{p.urlPath}</span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {formatNumber(p.sessions)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="min-w-0 p-5">
              {urlPath ? (
                mode === "click" ? (
                  <ClickHeatmap
                    data={detail.data}
                    loading={detailLoading}
                    urlPath={urlPath}
                  />
                ) : (
                  <ScrollHeatmap
                    data={detail.data}
                    loading={detailLoading}
                    urlPath={urlPath}
                  />
                )
              ) : (
                <EmptyState
                  title="Select a page"
                  description="Pick a page on the left to see its heatmap."
                />
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
