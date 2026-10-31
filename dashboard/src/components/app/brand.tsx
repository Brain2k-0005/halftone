import { useRouter, useRouterState } from "@tanstack/react-router"
import { useCallback, useSyncExternalStore } from "react"
import { Logo } from "@/components/app/logo"
import {
  APPEARANCE_KEY,
  DEFAULT_BRANDING,
  htmlAppearance,
  type Appearance,
  type Branding,
} from "@/lib/branding"
import { cn } from "@/lib/utils"

interface RootData {
  branding: Branding
  user: Appearance | null
  /** Public origin of the Umami server (tracker script, short links, pixels). */
  publicUrl: string
}

function useRootData(): RootData {
  return useRouterState({
    select: (s) =>
      (s.matches[0]?.loaderData as RootData | undefined) ?? {
        branding: DEFAULT_BRANDING,
        user: null,
        publicUrl: "",
      },
  })
}

/** Public origin of the Umami server, e.g. for the tracking snippet. */
export function useUmamiPublicUrl(): string {
  return useRootData().publicUrl
}

/** Instance branding from the root loader (falls back to defaults while an error page renders). */
export function useBranding(): Branding {
  return useRootData().branding
}

/*
 * The user's own appearance lives in a cookie (read by the root loader on the server, so the first paint
 * already has the right colours and shell). While a change is on its way we keep it optimistically here.
 */
let optimistic: Appearance | null | undefined
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const getOptimistic = () => optimistic

function writeCookie(value: Appearance | null) {
  document.cookie = value
    ? `${APPEARANCE_KEY}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=31536000; samesite=lax`
    : `${APPEARANCE_KEY}=; path=/; max-age=0; samesite=lax`
}

function applyAppearance(a: Appearance) {
  const h = document.documentElement
  const { style, dither } = htmlAppearance(a)
  for (const [k, v] of Object.entries(style)) h.style.setProperty(k, v)
  h.setAttribute("data-dither", dither)
}

/** The effective appearance for this browser: the user's override, else the instance default. */
export function useAppearance() {
  const { branding, user } = useRootData()
  const router = useRouter()
  const pending = useSyncExternalStore(
    subscribe,
    getOptimistic,
    () => undefined
  )
  const own = pending === undefined ? user : pending
  const appearance = own ?? branding.appearance

  const commit = useCallback(
    (next: Appearance | null) => {
      optimistic = next
      writeCookie(next)
      applyAppearance(next ?? branding.appearance)
      listeners.forEach((l) => l())
      void router.invalidate()
    },
    [branding.appearance, router]
  )

  return {
    appearance,
    custom: own !== null,
    setAppearance: (next: Appearance) => commit(next),
    /** Back to the instance default. */
    reset: () => commit(null),
  }
}

/** The instance logo (uploaded image or the built-in mark). */
export function AppLogo({
  className,
  branding,
}: {
  className?: string
  branding?: Branding
}) {
  const fromRoute = useBranding()
  const b = branding ?? fromRoute
  if (b.logo)
    return (
      <img src={b.logo} alt="" className={cn("object-contain", className)} />
    )
  return <Logo className={className} />
}
