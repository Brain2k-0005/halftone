import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { clearToken, storeToken, umami, UmamiError } from "@/server/umami"
import { isRange, resolveRange, type RangeKey } from "@/lib/range"

export interface User {
  id: string
  username: string
  role: string
  isAdmin: boolean
}

export interface Website {
  id: string
  name: string
  domain: string
  createdAt: string
}

export interface Stats {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

export interface Point {
  x: string
  y: number
}

export interface MetricRow {
  x: string
  y: number
}

export const METRIC_TYPES = [
  "path",
  "entry",
  "exit",
  "referrer",
  "channel",
  "browser",
  "os",
  "device",
  "country",
  "city",
  "event",
] as const

export type MetricType = (typeof METRIC_TYPES)[number]

const timezone = () =>
  process.env.UMAMI_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone

function rangeQuery(range: RangeKey) {
  const { startAt, endAt, unit } = resolveRange(range)
  return { startAt, endAt, unit, timezone: timezone() }
}

function validateRange(range: unknown): RangeKey {
  if (!isRange(range)) throw new Error("Invalid range")
  return range
}

function validateId(id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Invalid id")
  return id
}

/* ------------------------------------------------------------------ Auth */

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => {
    if (!d?.username || !d?.password)
      throw new Error("Username and password are required")
    return { username: String(d.username), password: String(d.password) }
  })
  .handler(async ({ data }) => {
    try {
      const res = await umami<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: data,
      })
      storeToken(res.token)
      return { ok: true as const, user: res.user }
    } catch (e) {
      if (e instanceof UmamiError && (e.status === 401 || e.status === 400)) {
        return { ok: false as const, error: "Incorrect username or password." }
      }
      return { ok: false as const, error: "Could not reach the Umami server." }
    }
  })

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  clearToken()
  return { ok: true }
})

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await umami<{ user: User }>("/me")
    return res.user
  } catch {
    return null
  }
})

/** Use inside loaders: turns a lost session into a redirect to /login. */
async function guard<T>(fn: () => Promise<T>) {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof UmamiError && e.status === 401)
      throw redirect({ to: "/login" })
    throw e
  }
}

/* ------------------------------------------------------------------ Websites */

export const websitesFn = createServerFn({ method: "GET" }).handler(() =>
  guard(async () => {
    const res = await umami<{ data: Website[] }>("/websites", {
      query: { pageSize: 200 },
    })
    // Online visitors per site feed the sidebar's quick access counters.
    return Promise.all(
      res.data.map(async ({ id, name, domain, createdAt }) => {
        const active = await umami<{ visitors: number }>(
          `/websites/${id}/active`
        ).catch(() => ({ visitors: 0 }))
        return { id, name, domain, createdAt, active: active.visitors }
      })
    )
  })
)

export const websiteFn = createServerFn({ method: "GET" })
  .validator((id: string) => validateId(id))
  .handler(({ data: id }) =>
    guard(async () => {
      const w = await umami<Website>(`/websites/${id}`)
      return {
        id: w.id,
        name: w.name,
        domain: w.domain,
        createdAt: w.createdAt,
      }
    })
  )

export const websitesSummaryFn = createServerFn({ method: "GET" })
  .validator((d: { range: RangeKey }) => ({ range: validateRange(d.range) }))
  .handler(({ data }) =>
    guard(async () => {
      const { data: sites } = await umami<{ data: Website[] }>("/websites", {
        query: { pageSize: 200 },
      })
      const q = rangeQuery(data.range)

      return Promise.all(
        sites.map(async (site) => {
          const [stats, series, active] = await Promise.all([
            umami<Stats & { comparison: Stats }>(`/websites/${site.id}/stats`, {
              query: q,
            }),
            umami<{ pageviews: Point[]; sessions: Point[] }>(
              `/websites/${site.id}/pageviews`,
              { query: q }
            ),
            umami<{ visitors: number }>(`/websites/${site.id}/active`),
          ])
          return {
            id: site.id,
            name: site.name,
            domain: site.domain,
            stats,
            sessions: series.sessions,
            pageviews: series.pageviews,
            active: active.visitors,
          }
        })
      )
    })
  )

/* ------------------------------------------------------------------ Website analytics */

export const overviewFn = createServerFn({ method: "GET" })
  .validator((d: { websiteId: string; range: RangeKey }) => ({
    websiteId: validateId(d.websiteId),
    range: validateRange(d.range),
  }))
  .handler(({ data }) =>
    guard(async () => {
      const q = rangeQuery(data.range)
      const base = `/websites/${data.websiteId}`
      const [stats, series, active] = await Promise.all([
        umami<Stats & { comparison: Stats }>(`${base}/stats`, { query: q }),
        umami<{ pageviews: Point[]; sessions: Point[] }>(`${base}/pageviews`, {
          query: q,
        }),
        umami<{ visitors: number }>(`${base}/active`),
      ])
      return { stats, series, active: active.visitors, unit: q.unit }
    })
  )

export const metricsFn = createServerFn({ method: "GET" })
  .validator(
    (d: {
      websiteId: string
      range: RangeKey
      type: MetricType
      limit?: number
    }) => {
      if (!METRIC_TYPES.includes(d.type)) throw new Error("Invalid metric type")
      return {
        websiteId: validateId(d.websiteId),
        range: validateRange(d.range),
        type: d.type,
        limit: Math.min(Math.max(Number(d.limit) || 10, 1), 100),
      }
    }
  )
  .handler(({ data }) =>
    guard(() =>
      umami<MetricRow[]>(`/websites/${data.websiteId}/metrics`, {
        query: {
          ...rangeQuery(data.range),
          type: data.type,
          limit: data.limit,
        },
      })
    )
  )

export interface Realtime {
  countries: Record<string, number>
  urls: Record<string, number>
  referrers: Record<string, number>
  events: {
    __type: string
    createdAt: string
    urlPath?: string
    eventName?: string
    country?: string
    browser?: string
    os?: string
    device?: string
  }[]
  series: { views: Point[]; visitors: Point[] }
  totals: { views: number; visitors: number; events: number; countries: number }
}

export const realtimeFn = createServerFn({ method: "GET" })
  .validator((id: string) => validateId(id))
  .handler(({ data: id }) =>
    guard(async () => {
      const [realtime, active] = await Promise.all([
        umami<Realtime>(`/realtime/${id}`, { query: { timezone: timezone() } }),
        umami<{ visitors: number }>(`/websites/${id}/active`),
      ])
      return { ...realtime, active: active.visitors }
    })
  )
