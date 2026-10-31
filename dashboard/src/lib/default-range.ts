import { createIsomorphicFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"
import { DEFAULT_RANGE, isRange, type RangeKey } from "@/lib/range"

/*
 * The user's default date range (Settings → Preferences). Stored in a cookie so the server renders
 * and loads the same range the browser will show; read on either side through one function.
 */
export const DATE_RANGE_COOKIE = "umami.date-range"

const read = createIsomorphicFn()
  .server(() => getCookie(DATE_RANGE_COOKIE))
  .client(() => {
    const m = document.cookie.match(/(?:^|;\s*)umami\.date-range=([^;]*)/)
    return m ? decodeURIComponent(m[1]!) : undefined
  })

export function defaultRange(): RangeKey {
  const value = read()
  return isRange(value) ? value : DEFAULT_RANGE
}

export function saveDefaultRange(range: RangeKey | null) {
  document.cookie = range
    ? `${DATE_RANGE_COOKIE}=${encodeURIComponent(range)}; path=/; max-age=31536000; samesite=lax`
    : `${DATE_RANGE_COOKIE}=; path=/; max-age=0; samesite=lax`
}
