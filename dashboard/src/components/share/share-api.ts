import { createServerFn } from "@tanstack/react-start"
import { UMAMI_API_URL } from "@/server/umami"
import {
  type MetricRow,
  type MetricType,
  type Point,
  type Stats,
} from "@/lib/api"
import { isRange, resolveRange, type RangeKey } from "@/lib/range"

/*
 * Public share pages: no login cookie. The share slug is exchanged for a signed share token
 * (`GET /share/:slug`), which is sent as `x-umami-share-token` (+ `x-umami-share-context`) to the
 * regular analytics endpoints. The token never reaches the browser.
 */

const SHARE_TOKEN_HEADER = "x-umami-share-token"
const SHARE_CONTEXT_HEADER = "x-umami-share-context"
const ENTITY_WEBSITE = 1

const SHARE_TYPES = [
  "path",
  "referrer",
  "channel",
  "country",
  "browser",
  "os",
  "device",
  "event",
] as const satisfies readonly MetricType[]

export type ShareMetrics = Partial<
  Record<(typeof SHARE_TYPES)[number], MetricRow[]>
>

interface ShareInfo {
  shareId: string
  shareType: number
  websiteId?: string
  parameters: Record<string, unknown>
  token: string
}

export class ShareError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

async function call<T>(
  path: string,
  query: Record<string, string | number> = {},
  token?: string
) {
  const url = new URL(UMAMI_API_URL + path)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token
        ? { [SHARE_TOKEN_HEADER]: token, [SHARE_CONTEXT_HEADER]: "1" }
        : {}),
    },
  })
  if (!res.ok || !res.headers.get("content-type")?.includes("application/json"))
    throw new ShareError(
      res.status === 404
        ? "This share link does not exist."
        : "The shared data could not be loaded.",
      res.status
    )
  return (await res.json()) as T
}

export const shareFn = createServerFn({ method: "GET" })
  .validator((d: { slug: string; range: RangeKey }) => {
    if (!isRange(d.range)) throw new Error("Invalid range")
    return d
  })
  .handler(async ({ data }) => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(data.slug))
      return { status: "missing" as const }
    try {
      const share = await call<ShareInfo>(`/share/${data.slug}`)
      if (share.shareType !== ENTITY_WEBSITE || !share.websiteId)
        return { status: "unsupported" as const }
      if (share.parameters?.overview === false)
        return { status: "unsupported" as const }

      const { startAt, endAt, unit } = resolveRange(data.range)
      const timezone =
        process.env.UMAMI_TIMEZONE ??
        Intl.DateTimeFormat().resolvedOptions().timeZone
      const q = { startAt, endAt, unit, timezone }
      const base = `/websites/${share.websiteId}`
      const t = share.token

      const [website, stats, series, ...lists] = await Promise.all([
        call<{ name: string; domain: string }>(base, {}, t),
        call<Stats & { comparison: Stats }>(`${base}/stats`, q, t),
        call<{ pageviews: Point[]; sessions: Point[] }>(
          `${base}/pageviews`,
          q,
          t
        ),
        ...SHARE_TYPES.map((type) =>
          call<MetricRow[]>(
            `${base}/metrics`,
            { ...q, type, limit: 6 },
            t
          ).catch(() => [] as MetricRow[])
        ),
      ])
      const metrics: ShareMetrics = Object.fromEntries(
        SHARE_TYPES.map((type, i) => [type, lists[i]])
      )

      return {
        status: "ok" as const,
        name: website.name,
        domain: website.domain,
        stats,
        series,
        unit,
        metrics,
      }
    } catch (e) {
      if (e instanceof ShareError && e.status === 404)
        return { status: "missing" as const }
      throw e
    }
  })
