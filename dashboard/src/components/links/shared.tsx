import { UMAMI_PUBLIC_URL } from "@/server/umami"
import { createServerFn } from "@tanstack/react-start"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { TEAM_COOKIE } from "@/lib/team"

/*
 * Helpers shared by links, pixels and boards: the selected workspace (team cookie), the public host of the
 * short links / pixels, and slug generation.
 */

/** Selected team id from the `umami_team` cookie. `undefined` until mounted (cookie is read client-side only). */
export function useTeamId() {
  const [teamId, setTeamId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TEAM_COOKIE}=`))
    const value = match
      ? decodeURIComponent(match.slice(TEAM_COOKIE.length + 1))
      : ""
    setTeamId(/^[0-9a-f-]{36}$/i.test(value) ? value : null)
  }, [])
  return teamId
}

/** `/links` or `/teams/:id/links` depending on the workspace; `null` until the cookie has been read. */
export function scopedPath(teamId: string | null | undefined, base: string) {
  if (teamId === undefined) return null
  return teamId ? `/teams/${teamId}${base}` : base
}

const hostsFn = createServerFn({ method: "GET" }).handler(() => {
  const origin = UMAMI_PUBLIC_URL
  return {
    linksUrl: (process.env.UMAMI_LINKS_URL ?? `${origin}/q`).replace(/\/$/, ""),
    pixelsUrl: (process.env.UMAMI_PIXELS_URL ?? `${origin}/p`).replace(
      /\/$/,
      ""
    ),
  }
})

/** Public base URLs of short links (`/q`) and pixels (`/p`) on the Umami server. */
export function useHosts() {
  const { data } = useQuery({
    queryKey: ["hosts"],
    queryFn: () => hostsFn(),
    staleTime: Infinity,
  })
  return data ?? { linksUrl: "", pixelsUrl: "" }
}

const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export function randomSlug(length = 9) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")
}
