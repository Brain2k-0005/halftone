import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server"

const TOKEN_COOKIE = "umami_token"

export const UMAMI_API_URL = (
  process.env.UMAMI_API_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "")

/**
 * Public origin of the Umami server (serves script.js, recorder.js, /q short links, /p pixels and /api/send).
 * Differs from UMAMI_API_URL in Docker, where the dashboard reaches the API over the internal network.
 */
export const UMAMI_PUBLIC_URL = (
  process.env.UMAMI_PUBLIC_URL ?? new URL(UMAMI_API_URL).origin
).replace(/\/$/, "")

export class UmamiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export function getToken() {
  return getCookie(TOKEN_COOKIE)
}

export function storeToken(token: string) {
  setCookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearToken() {
  deleteCookie(TOKEN_COOKIE, { path: "/" })
}

type Query = Record<string, string | number | undefined>

export async function umami<T>(
  path: string,
  init: { query?: Query; method?: string; body?: unknown } = {}
) {
  const url = new URL(UMAMI_API_URL + path)

  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== "")
      url.searchParams.set(key, String(value))
  }

  const token = getToken()
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  const isJson = res.headers.get("content-type")?.includes("application/json")

  if (!res.ok || !isJson) {
    if (res.status === 401) clearToken()
    // Only surface short JSON error messages; HTML error pages stay in the server log.
    const body = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "")
    const detail = errorMessage(body)
    if (!isJson)
      console.error(`[umami] ${res.status} ${path}`, String(body).slice(0, 500))
    throw new UmamiError(
      detail ||
        `The Umami API returned ${res.status} for ${path.split("?")[0]}.`,
      res.status
    )
  }

  return (await res.json()) as T
}

/** Umami returns `{ error: { message } }`, `{ error: "…" }` or `{ message }` depending on the route. */
function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return ""
  const b = body as { message?: unknown; error?: unknown }
  if (typeof b.message === "string") return b.message
  if (typeof b.error === "string") return b.error
  if (
    b.error &&
    typeof b.error === "object" &&
    typeof (b.error as { message?: unknown }).message === "string"
  )
    return (b.error as { message: string }).message
  return ""
}
