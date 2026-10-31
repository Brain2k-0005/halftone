import { useRouterState } from "@tanstack/react-router"
import { useCallback, useSyncExternalStore } from "react"
import { Logo } from "@/components/app/logo"
import {
  APPEARANCE_KEY,
  DEFAULT_BRANDING,
  PRESETS,
  RADII,
  htmlAppearance,
  sanitizeAppearance,
  type Appearance,
  type Branding,
} from "@/lib/branding"
import { cn } from "@/lib/utils"

/** Instance branding from the root loader (falls back to defaults while an error page renders). */
export function useBranding(): Branding {
  return useRouterState({
    select: (s) =>
      (s.matches[0]?.loaderData as Branding | undefined) ?? DEFAULT_BRANDING,
  })
}

/*
 * Runs before paint (inlined in <head>): applies the user's saved appearance so there is no flash of the
 * instance default. Mirrors applyAppearance() below.
 */
export const appearanceScript = `(function(){try{var a=JSON.parse(localStorage.getItem('${APPEARANCE_KEY}')||'null');if(!a)return;var p=${JSON.stringify(
  Object.fromEntries(PRESETS.map((p) => [p.id, p.accent]))
)};var r=${JSON.stringify(Object.fromEntries(RADII.map((r) => [r.id, r.value])))};var h=document.documentElement;var c=a.preset==='custom'?a.accent:p[a.preset];if(/^#[0-9a-f]{6}$/i.test(c))h.style.setProperty('--brand',c);if(r[a.radius])h.style.setProperty('--radius',r[a.radius]);if(typeof a.dither==='boolean')h.setAttribute('data-dither',a.dither?'on':'off')}catch(e){}})()`

function applyAppearance(a: Appearance) {
  const h = document.documentElement
  const { style, dither } = htmlAppearance(a)
  for (const [k, v] of Object.entries(style)) h.style.setProperty(k, v)
  h.setAttribute("data-dither", dither)
}

const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const readStored = () =>
  typeof window === "undefined" ? null : localStorage.getItem(APPEARANCE_KEY)

/** The effective appearance for this browser: the user's override, else the instance default. */
export function useAppearance() {
  const branding = useBranding()
  const raw = useSyncExternalStore(subscribe, readStored, () => null)
  const custom = raw !== null
  const appearance = custom
    ? sanitizeAppearance(safeParse(raw), branding.appearance)
    : branding.appearance

  const setAppearance = useCallback((next: Appearance) => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next))
    applyAppearance(next)
    listeners.forEach((l) => l())
  }, [])

  /** Back to the instance default. */
  const reset = useCallback(() => {
    localStorage.removeItem(APPEARANCE_KEY)
    applyAppearance(branding.appearance)
    listeners.forEach((l) => l())
  }, [branding.appearance])

  return {
    appearance,
    custom,
    setAppearance,
    reset,
    previewInstance: applyAppearance,
  }
}

function safeParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
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
