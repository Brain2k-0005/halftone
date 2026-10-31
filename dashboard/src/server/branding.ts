import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import {
  DEFAULT_BRANDING,
  sanitizeBranding,
  type Branding,
} from "@/lib/branding"

/*
 * Instance branding storage: a small JSON file on the dashboard server (mount it as a volume in Docker).
 * Environment variables provide defaults and are the only source on read-only hosts (e.g. Vercel):
 *   BRAND_NAME, BRAND_LOGO_URL, BRAND_ACCENT (#rrggbb), BRAND_PRESET, BRANDING_FILE (path)
 */

const FILE = resolve(process.env.BRANDING_FILE ?? "data/branding.json")

function envDefaults(): Branding {
  return sanitizeBranding({
    name: process.env.BRAND_NAME,
    logo: process.env.BRAND_LOGO_URL,
    appearance: {
      ...DEFAULT_BRANDING.appearance,
      preset: process.env.BRAND_ACCENT
        ? "custom"
        : (process.env.BRAND_PRESET ?? DEFAULT_BRANDING.appearance.preset),
      accent: process.env.BRAND_ACCENT ?? DEFAULT_BRANDING.appearance.accent,
    },
  })
}

let cache: { value: Branding; at: number } | null = null

export async function readBranding(): Promise<Branding> {
  if (cache && Date.now() - cache.at < 5_000) return cache.value
  const defaults = envDefaults()
  let value = defaults
  try {
    value = sanitizeBranding(JSON.parse(await readFile(FILE, "utf8")), defaults)
  } catch {
    // No file yet (or unreadable): environment defaults.
  }
  cache = { value, at: Date.now() }
  return value
}

export async function writeBranding(input: unknown): Promise<Branding> {
  const value = sanitizeBranding(input, envDefaults())
  await mkdir(dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(value, null, 2), "utf8")
  cache = { value, at: Date.now() }
  return value
}
