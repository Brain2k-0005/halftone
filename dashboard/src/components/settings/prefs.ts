import { useCallback, useEffect, useState } from "react"

/** Same localStorage keys as the original Umami UI. */
export const LOCALE_KEY = "umami.locale"
export const TIMEZONE_KEY = "umami.timezone"
export const DATE_RANGE_KEY = "umami.date-range"

export const DEFAULT_LOCALE = "en-US"

export const localTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone

/** String preference in localStorage (read after mount so SSR markup stays stable). */
export function usePref(key: string, fallback: string) {
  const [value, setValue] = useState(fallback)
  useEffect(() => {
    setValue(localStorage.getItem(key) ?? fallback)
  }, [key, fallback])
  const save = useCallback(
    (next: string) => {
      localStorage.setItem(key, next)
      setValue(next)
    },
    [key]
  )
  return [value, save] as const
}
