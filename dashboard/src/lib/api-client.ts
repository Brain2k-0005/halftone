import { createServerFn } from "@tanstack/react-start"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { umami, UmamiError } from "@/server/umami"

/*
 * Generic access to the Umami REST API for every page of the dashboard.
 *
 * The browser never talks to Umami directly: `apiFn` is a TanStack Start server function that forwards
 * the call with the token from the httpOnly cookie. Paths are relative to the API root, e.g.
 * `/websites/${id}/events`. Use the hooks below in components:
 *
 *   const { data } = useApi<Event[]>(`/websites/${websiteId}/events`, { ...dateQuery, page: 1 })
 *   const save = useApiMutation("POST", `/websites/${websiteId}`)  // save.mutate(body)
 */

export type Method = "GET" | "POST" | "DELETE"
export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json }
export type Query = Record<string, string | number | boolean | undefined | null>

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

const PATH = /^\/[A-Za-z0-9/_\-.]*$/

export const apiFn = createServerFn({ method: "POST" })
  .validator(
    (d: { method: Method; path: string; query?: Query; body?: unknown }) => {
      if (!["GET", "POST", "DELETE"].includes(d.method))
        throw new Error("Invalid method")
      if (!PATH.test(d.path) || d.path.includes(".."))
        throw new Error("Invalid path")
      return d
    }
  )
  .handler(async ({ data }) => {
    const query = Object.fromEntries(
      Object.entries(data.query ?? {})
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    )
    try {
      const result = await umami<Json>(data.path, {
        method: data.method,
        query,
        body: data.body,
      })
      return { ok: true as const, data: result }
    } catch (e) {
      if (e instanceof UmamiError)
        return { ok: false as const, status: e.status, message: e.message }
      return {
        ok: false as const,
        status: 500,
        message: e instanceof Error ? e.message : "Request failed",
      }
    }
  })

export async function api<T>(
  method: Method,
  path: string,
  query?: Query,
  body?: unknown
): Promise<T> {
  const res = await apiFn({
    data: { method, path, query: query ?? undefined, body },
  })
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined")
      window.location.href = "/login"
    throw new ApiError(res.message, res.status)
  }
  return res.data as T
}

export const apiGet = <T>(path: string, query?: Query) =>
  api<T>("GET", path, query)
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>("POST", path, undefined, body)
export const apiDelete = <T>(path: string) => api<T>("DELETE", path)

/** Query hook: the key is the path plus the query object, so changing filters refetches automatically. */
export function useApi<T>(
  path: string | null,
  query?: Query,
  options?: Omit<
    UseQueryOptions<T, ApiError, T, QueryKey>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<T, ApiError>({
    queryKey: ["api", path, query ?? {}],
    queryFn: () => apiGet<T>(path!, query),
    enabled: !!path && (options?.enabled ?? true),
    ...options,
  })
}

/**
 * Mutation hook. After success every query whose path starts with one of `invalidate`
 * (default: the mutated path's first two segments, e.g. `/websites/abc`) is refetched.
 */
export function useApiMutation<TBody = unknown, TResult = unknown>(
  method: Exclude<Method, "GET">,
  path: string,
  invalidate?: string[]
) {
  const client = useQueryClient()
  return useMutation<TResult, ApiError, TBody>({
    mutationFn: (body) => api<TResult>(method, path, undefined, body),
    onSuccess: () => {
      const prefixes = invalidate ?? [
        "/" + path.split("/").filter(Boolean).slice(0, 2).join("/"),
      ]
      return client.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "api" &&
          typeof q.queryKey[1] === "string" &&
          prefixes.some((p) => (q.queryKey[1] as string).startsWith(p)),
      })
    },
  })
}

/** Umami list endpoints return `{ data, count, page, pageSize }`. */
export interface Paged<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
