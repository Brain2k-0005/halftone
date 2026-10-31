/*
 * Themes and branding.
 *
 * Two layers:
 * - Branding (instance-wide, set by an admin): app name, logo, default theme. Stored on the dashboard
 *   server (see server/branding.ts) and delivered with every page.
 * - Appearance (per user, in localStorage): preset or custom accent, corner radius, dither on/off.
 *   Overrides the instance default on that browser.
 *
 * Everything colour-related flows from one CSS variable, --brand (see styles.css).
 */

export const PRESETS = [
  { id: "violet", label: "Violet", accent: "#6d5dfc" },
  { id: "ocean", label: "Ocean", accent: "#3b82f6" },
  { id: "emerald", label: "Emerald", accent: "#10b981" },
  { id: "amber", label: "Amber", accent: "#f59e0b" },
  { id: "rose", label: "Rose", accent: "#f43f5e" },
  { id: "cyan", label: "Cyan", accent: "#06b6d4" },
  { id: "mono", label: "Mono", accent: "#a1a1aa" },
] as const

export type PresetId = (typeof PRESETS)[number]["id"]

export const RADII = [
  { id: "sharp", label: "Sharp", value: "0.3rem" },
  { id: "default", label: "Default", value: "0.6rem" },
  { id: "round", label: "Round", value: "0.95rem" },
] as const

export type RadiusId = (typeof RADII)[number]["id"]

export const SHELLS = [
  {
    id: "sidebar",
    label: "Sidebar",
    description: "Classic sidebar, content right next to it",
  },
  {
    id: "inset",
    label: "Inset",
    description: "Shell in the background, content in its own container",
  },
  {
    id: "floating",
    label: "Floating",
    description: "Sidebar and content as separate floating cards",
  },
  {
    id: "inbox",
    label: "Inbox",
    description:
      "Icon rail for the main areas, a second column for their pages",
  },
] as const

export type ShellId = (typeof SHELLS)[number]["id"]

export interface Appearance {
  /** A preset id, or "custom" to use `accent`. */
  preset: PresetId | "custom"
  accent: string
  radius: RadiusId
  dither: boolean
  shell: ShellId
}

export interface Branding {
  name: string
  /** data: URL (uploaded) or https URL; empty = built-in logo. */
  logo: string
  appearance: Appearance
}

export const DEFAULT_APPEARANCE: Appearance = {
  preset: "violet",
  accent: "#6d5dfc",
  radius: "default",
  dither: true,
  shell: "sidebar",
}

export const DEFAULT_BRANDING: Branding = {
  name: "Halftone",
  logo: "",
  appearance: DEFAULT_APPEARANCE,
}

const HEX = /^#[0-9a-f]{6}$/i

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value)
}

/** Coerces untrusted input (JSON file, request body, localStorage) into a valid Appearance. */
export function sanitizeAppearance(
  input: unknown,
  fallback: Appearance = DEFAULT_APPEARANCE
): Appearance {
  const a = (input ?? {}) as Partial<Appearance>
  const preset =
    a.preset === "custom" || PRESETS.some((p) => p.id === a.preset)
      ? (a.preset as Appearance["preset"])
      : fallback.preset
  return {
    preset,
    accent: isHex(a.accent) ? a.accent : fallback.accent,
    radius: RADII.some((r) => r.id === a.radius)
      ? (a.radius as RadiusId)
      : fallback.radius,
    dither: typeof a.dither === "boolean" ? a.dither : fallback.dither,
    shell: SHELLS.some((x) => x.id === a.shell)
      ? (a.shell as ShellId)
      : fallback.shell,
  }
}

const LOGO =
  /^(data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s"'<>]+)$/

export const MAX_LOGO_BYTES = 300_000

export function sanitizeBranding(
  input: unknown,
  fallback: Branding = DEFAULT_BRANDING
): Branding {
  const b = (input ?? {}) as Partial<Branding>
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 40) : ""
  const logo =
    typeof b.logo === "string" &&
    b.logo.length <= MAX_LOGO_BYTES * 1.4 &&
    LOGO.test(b.logo)
      ? b.logo
      : ""
  return {
    name: name || fallback.name,
    logo,
    appearance: sanitizeAppearance(b.appearance, fallback.appearance),
  }
}

export function accentOf(a: Appearance) {
  return a.preset === "custom"
    ? a.accent
    : (PRESETS.find((p) => p.id === a.preset)?.accent ?? a.accent)
}

export function radiusOf(a: Appearance) {
  return RADII.find((r) => r.id === a.radius)?.value ?? "0.6rem"
}

/** Inline style + data attributes for <html>, used on the server render and on the client. */
export function htmlAppearance(a: Appearance) {
  return {
    style: { "--brand": accentOf(a), "--radius": radiusOf(a) } as Record<
      string,
      string
    >,
    dither: a.dither ? "on" : "off",
  }
}

/** Cookie holding the user's own appearance, so the server renders the right theme and shell. */
export const APPEARANCE_KEY = "umami-appearance"
