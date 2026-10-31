import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Skeleton } from "@/components/app/ui-kit"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getRouteApi } from "@tanstack/react-router"
import { formatNumber, isOnSiteDomain } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * Click / scroll heat overlays on top of the recorded page snapshot (an iframe served by Umami).
 * Points and scroll buckets are grouped by the visitor's screen width (same buckets as the original),
 * normalised to the selected width and drawn at real page coordinates inside a canvas that is scaled to fit.
 */

export interface HeatmapPoint {
  x: number
  y: number
  pageX: number
  pageY: number
  pageW: number
  pageH: number
  viewportW: number
  viewportH: number
  count: number
}

export interface HeatmapSnapshot {
  kind: "iframe"
  id: string
  url: string
  pageW: number
  pageH: number
  viewportW: number
  viewportH: number
}

export interface ScrollBucket {
  depth: number
  sessions: number
  pageW: number
  pageH: number
  viewportW: number
  viewportH: number
}

export interface HeatmapResult {
  mode: "click" | "scroll"
  pages: { urlPath: string; count: number; sessions: number }[]
  points: HeatmapPoint[]
  snapshot: HeatmapSnapshot | null
  scroll: {
    buckets: ScrollBucket[]
    totalSessions: number
    pageW: number
    pageH: number
    viewportW: number
    viewportH: number
  }
}

const WIDTHS = [320, 375, 425, 768, 1024, 1440, 1920] as const
const SCROLL_STEP = 10
const MIN_HEIGHT = 640

const bucketWidth = (w: number) =>
  WIDTHS.reduce(
    (best, x) => (Math.abs(w - x) < Math.abs(w - best) ? x : best),
    WIDTHS[0] as number
  )

interface WidthGroup {
  width: number
  count: number
  pageH: number
  viewportH: number
}

function groupWidths(
  rows: { viewportW: number; viewportH: number; pageH: number; count: number }[]
): WidthGroup[] {
  const map = new Map<number, WidthGroup>()
  for (const r of rows) {
    const width = bucketWidth(r.viewportW)
    const scale = width / Math.max(1, r.viewportW)
    const g = map.get(width) ?? {
      width,
      count: 0,
      pageH: 0,
      viewportH: r.viewportH * scale,
    }
    g.count += r.count
    g.pageH = Math.max(g.pageH, r.pageH * scale)
    map.set(width, g)
  }
  return WIDTHS.map((w) => map.get(w)).filter((g): g is WidthGroup => !!g)
}

function WidthIcon({ width }: { width: number }) {
  const Icon =
    width <= 425 ? SmartphoneIcon : width <= 1024 ? TabletIcon : MonitorIcon
  return <Icon className="size-3.5" />
}

function WidthSelect({
  groups,
  value,
  onChange,
}: {
  groups: WidthGroup[]
  value: number | null
  onChange: (w: number) => void
}) {
  if (groups.length === 0) return null
  return (
    <Select
      value={String(value ?? "")}
      onValueChange={(v) => onChange(Number(v))}
      items={groups.map((g) => ({
        value: String(g.width),
        label: `${g.width}px`,
      }))}
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.width} value={String(g.width)}>
            <WidthIcon width={g.width} /> {g.width}px
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Width bucket selection: defaults to the busiest one and re-defaults when the data changes. */
function useWidth(groups: WidthGroup[]) {
  const [selected, setSelected] = useState<number | null>(null)
  const busiest = useMemo(
    () =>
      groups.reduce<WidthGroup | null>(
        (b, g) => (!b || g.count > b.count ? g : b),
        null
      ),
    [groups]
  )
  const current = groups.find((g) => g.width === selected) ?? busiest
  return { group: current, setWidth: setSelected }
}

function useFit(renderWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setAvailable(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale =
    available && renderWidth ? Math.min(1, available / renderWidth) : 1
  return { ref, scale }
}

function snapshotHeight(s: HeatmapSnapshot) {
  return s.pageH <= s.viewportH * 1.25 ? s.viewportH : s.pageH
}

const websiteRoute = getRouteApi("/_app/websites/$websiteId")

function Frame({
  snapshot,
  renderWidth,
  renderHeight,
  loading,
  children,
}: {
  snapshot: HeatmapSnapshot | null
  renderWidth: number
  renderHeight: number
  loading: boolean
  children: React.ReactNode
}) {
  const { ref, scale } = useFit(renderWidth)
  const { website } = websiteRoute.useLoaderData()
  const [ready, setReady] = useState(!snapshot)

  useEffect(() => {
    setReady(!snapshot)
    if (!snapshot) return
    const t = window.setTimeout(() => setReady(true), 1500)
    return () => window.clearTimeout(t)
  }, [snapshot?.id])

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-lg border bg-muted/30"
    >
      <div
        className="relative"
        style={{ width: renderWidth * scale, height: renderHeight * scale }}
      >
        {loading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : (
          <div
            className="absolute top-0 left-0 origin-top-left bg-background"
            style={{
              width: renderWidth,
              height: renderHeight,
              transform: `scale(${scale})`,
            }}
          >
            {snapshot && isOnSiteDomain(snapshot.url, website.domain) && (
              <iframe
                // The URL is built from a tracked path: only the site's own domain is framed, and the sandbox
                // blocks top-level navigation, popups and forms from the framed page.
                sandbox="allow-scripts allow-same-origin"
                src={snapshot.url}
                title={snapshot.url}
                tabIndex={-1}
                loading="lazy"
                scrolling="no"
                referrerPolicy="no-referrer"
                onLoad={() => setReady(true)}
                onError={() => setReady(true)}
                className="pointer-events-none absolute top-0 left-0 block border-0"
                style={{ width: "100%", height: snapshotHeight(snapshot) }}
              />
            )}
            {!ready && (
              <Skeleton className="absolute inset-0 rounded-none opacity-60" />
            )}
            {ready && children}
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-[13px] text-muted-foreground">
      {message}
    </div>
  )
}

export function ClickHeatmap({
  data,
  loading,
  urlPath,
}: {
  data: HeatmapResult | undefined
  loading: boolean
  urlPath: string
}) {
  const points = data?.points ?? []
  const groups = useMemo(
    () => groupWidths(points.map((p) => ({ ...p, count: p.count }))),
    [points]
  )
  const { group, setWidth } = useWidth(groups)

  const visible = useMemo(() => {
    if (!group) return []
    const merged = new Map<string, HeatmapPoint>()
    for (const p of points) {
      if (bucketWidth(p.viewportW) !== group.width) continue
      const s = group.width / Math.max(1, p.viewportW)
      const pageX = Math.round(p.pageX * s)
      const pageY = Math.round(p.pageY * s)
      const key = `${pageX}:${pageY}`
      const existing = merged.get(key)
      if (existing) existing.count += p.count
      else merged.set(key, { ...p, pageX, pageY, count: p.count })
    }
    return [...merged.values()]
  }, [points, group])

  const max = visible.reduce((m, p) => Math.max(m, p.count), 1)
  const total = visible.reduce((s, p) => s + p.count, 0)
  const snapshot = data?.snapshot ?? null
  const height = Math.max(
    snapshot ? snapshotHeight(snapshot) : (group?.pageH ?? 0),
    MIN_HEIGHT
  )
  const width = group?.width ?? snapshot?.viewportW ?? 1024

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular text-[13px] text-muted-foreground">
          {loading
            ? "Loading heatmap …"
            : group
              ? `${formatNumber(visible.length)} positions · ${formatNumber(total)} clicks`
              : "No click data for this page yet."}
        </span>
        <WidthSelect
          groups={groups}
          value={group?.width ?? null}
          onChange={setWidth}
        />
      </div>
      {!loading && !group ? (
        <Empty message="No click data for this page yet." />
      ) : (
        <Frame
          snapshot={snapshot}
          renderWidth={width}
          renderHeight={height}
          loading={loading}
        >
          <div
            className="absolute inset-0 overflow-hidden"
            aria-label={`Click heatmap for ${urlPath}`}
          >
            {visible.map((p, i) => {
              const intensity = Math.min(1, p.count / max)
              const size = 24 + intensity * 36
              return (
                <div
                  key={`${p.pageX}-${p.pageY}-${i}`}
                  title={`${p.count} click${p.count === 1 ? "" : "s"}`}
                  className="absolute rounded-full"
                  style={{
                    left: Math.max(0, Math.min(width, p.pageX)),
                    top: Math.max(0, p.pageY),
                    width: size,
                    height: size,
                    transform: "translate(-50%, -50%)",
                    opacity: 0.4 + intensity * 0.55,
                    background:
                      "radial-gradient(circle, var(--destructive) 0%, color-mix(in oklab, var(--warning) 70%, transparent) 45%, transparent 80%)",
                  }}
                />
              )
            })}
          </div>
        </Frame>
      )}
    </div>
  )
}

export function ScrollHeatmap({
  data,
  loading,
  urlPath,
}: {
  data: HeatmapResult | undefined
  loading: boolean
  urlPath: string
}) {
  const scroll = data?.scroll
  const rows = useMemo(
    () => (scroll?.buckets ?? []).map((b) => ({ ...b, count: b.sessions })),
    [scroll]
  )
  const groups = useMemo(() => groupWidths(rows), [rows])
  const { group, setWidth } = useWidth(groups)

  const bands = useMemo(() => {
    if (!group) return []
    const byDepth = new Map<number, number>()
    for (const r of rows) {
      if (bucketWidth(r.viewportW) !== group.width) continue
      byDepth.set(r.depth, (byDepth.get(r.depth) ?? 0) + r.sessions)
    }
    const total = group.count
    const out: { from: number; to: number; reached: number; ratio: number }[] =
      []
    let dropped = 0
    for (let depth = 0; depth < 100; depth += SCROLL_STEP) {
      const before = Math.max(0, total - dropped)
      dropped += byDepth.get(depth) ?? 0
      const after = Math.max(0, total - dropped)
      if (before > 0)
        out.push({
          from: depth,
          to: Math.min(100, depth + SCROLL_STEP),
          reached: after,
          ratio: total ? after / total : 0,
        })
    }
    return out
  }, [rows, group])

  const snapshot = data?.snapshot ?? null
  const hasData = !!group && bands.length > 0
  const height = Math.max(
    snapshot ? snapshotHeight(snapshot) : (group?.pageH ?? scroll?.pageH ?? 0),
    MIN_HEIGHT
  )
  const width = group?.width ?? snapshot?.viewportW ?? 1024

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular text-[13px] text-muted-foreground">
          {loading
            ? "Loading heatmap …"
            : hasData
              ? `${formatNumber(group.count)} sessions · page ${Math.round(group.width)}×${Math.round(group.pageH)}`
              : "No scroll data for this page yet."}
        </span>
        <WidthSelect
          groups={groups}
          value={group?.width ?? null}
          onChange={setWidth}
        />
      </div>
      {!loading && !hasData ? (
        <Empty message="No scroll data for this page yet." />
      ) : (
        <Frame
          snapshot={snapshot}
          renderWidth={width}
          renderHeight={height}
          loading={loading}
        >
          <div
            className="absolute inset-0"
            aria-label={`Scroll heatmap for ${urlPath}`}
          >
            {bands.map((b) => (
              <div
                key={b.from}
                title={`${b.to}% depth · ${formatNumber(b.reached)} sessions reached`}
                className={cn(
                  "absolute inset-x-0 flex items-start justify-end px-3 py-1"
                )}
                style={{
                  top: `${b.from}%`,
                  height: `${b.to - b.from}%`,
                  background: `color-mix(in oklab, var(--brand) ${Math.round(12 + b.ratio * 45)}%, transparent)`,
                }}
              >
                <span className="tabular rounded bg-card/90 px-1.5 py-0.5 text-[11px] font-medium shadow-xs">
                  {b.to}% depth · {Math.round(b.ratio * 100)}% reached
                </span>
              </div>
            ))}
          </div>
        </Frame>
      )}
    </div>
  )
}
