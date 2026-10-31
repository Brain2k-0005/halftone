import { VideoOffIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { EmptyState, Skeleton } from "@/components/app/ui-kit"
import "rrweb-player/dist/style.css"

/*
 * rrweb-player wrapper. The library touches `window`, so it is imported inside an effect (client only).
 * Event normalisation is ported from the original `lib/replay.ts`.
 */

const FULL_SNAPSHOT = 2
const META = 4
const DEFAULT_RATIO = 9 / 16
const CONTROLLER_HEIGHT = 80

type RrEvent = { type?: number; timestamp?: unknown; data?: any }

const timestampOf = (e: RrEvent) => {
  const t = Number(e?.timestamp)
  return Number.isFinite(t) ? t : null
}

function hasReplayableSnapshot(events: RrEvent[]) {
  return events.some(
    (e) =>
      e?.type === FULL_SNAPSHOT &&
      Number.isInteger(e.data?.node?.type) &&
      Array.isArray(e.data?.node?.childNodes)
  )
}

export function getPlayerEvents(
  events: RrEvent[] | null | undefined
): RrEvent[] {
  if (!Array.isArray(events)) return []
  const list = events.filter(
    (e) => e && typeof e === "object" && e.type != null
  )
  if (!hasReplayableSnapshot(list)) return []

  const first = list.map(timestampOf).find((t) => t !== null) ?? Date.now()
  let last = first - 1
  const normalized = list.map((e) => {
    const t = timestampOf(e)
    if (t !== null) {
      last = t
      return typeof e.timestamp === "number" ? e : { ...e, timestamp: t }
    }
    last += 1
    return { ...e, timestamp: last }
  })

  if (normalized.length === 1) {
    return [
      normalized[0]!,
      {
        ...normalized[0]!,
        timestamp: (normalized[0]!.timestamp as number) + 1,
      },
    ]
  }
  return normalized
}

export function getViewport(events: RrEvent[]) {
  const meta = events.find(
    (e) =>
      e?.type === META &&
      Number(e.data?.width) > 0 &&
      Number(e.data?.height) > 0
  )
  return meta
    ? { width: Number(meta.data.width), height: Number(meta.data.height) }
    : null
}

function destroy(player: { $destroy?: () => void } | null) {
  try {
    player?.$destroy?.()
  } catch {
    // rrweb-player alpha teardown can throw after it lost its inner replayer.
  }
}

export function ReplayPlayer({ events }: { events: RrEvent[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  const playerEvents = useMemo(() => getPlayerEvents(events), [events])
  const viewport = useMemo(() => getViewport(playerEvents), [playerEvents])
  const canReplay = playerEvents.length >= 2

  const ratio = viewport ? viewport.height / viewport.width : DEFAULT_RATIO
  const portrait = viewport ? viewport.height > viewport.width : false
  const fitted = portrait
    ? Math.min(Math.max(ratio, DEFAULT_RATIO), 2.25)
    : Math.min(Math.max(ratio, DEFAULT_RATIO), 1.5)
  let width = Math.min(1024, available || 1024)
  let height = Math.round(width * fitted)
  if (portrait) {
    const maxH = Math.max(
      240,
      Math.round(
        (typeof window !== "undefined" ? window.innerHeight : 900) * 0.7
      )
    )
    if (height > maxH) {
      height = maxH
      width = Math.max(1, Math.round(height / fitted))
    }
  }

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setAvailable(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !canReplay || !available) return
    let cancelled = false
    let player: any = null
    setFailed(false)
    setReady(false)
    root.replaceChildren()

    import("rrweb-player")
      .then((mod) => {
        if (cancelled) return
        try {
          const Player = mod.default as any
          player = new Player({
            target: root,
            props: {
              events: playerEvents,
              width,
              height,
              autoPlay: false,
              showController: true,
              speedOption: [1, 2, 4, 8],
              useVirtualDom: false,
              showWarning: false,
            },
          })
          if (cancelled) destroy(player)
          else setReady(true)
        } catch {
          root.replaceChildren()
          if (!cancelled) setFailed(true)
        }
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      destroy(player)
      root.replaceChildren()
    }
  }, [canReplay, playerEvents, width, height, available])

  const unavailable = !canReplay || failed

  return (
    <div ref={wrapperRef} className="flex w-full justify-center">
      <div
        className="relative max-w-full overflow-hidden rounded-lg border bg-muted/40"
        style={{
          width,
          height: unavailable
            ? Math.max(height, 240)
            : height + CONTROLLER_HEIGHT,
        }}
      >
        <div
          ref={rootRef}
          className={unavailable ? "hidden" : "block"}
          style={{ width }}
        />
        {!unavailable && !ready && (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
        {unavailable && (
          <EmptyState
            icon={VideoOffIcon}
            title="Replay unavailable"
            description="This recording has no replayable snapshot, so it cannot be played back."
          />
        )}
      </div>
    </div>
  )
}
