const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const plain = new Intl.NumberFormat("en")

export function formatNumber(n: number) {
  return Math.abs(n) >= 10_000 ? compact.format(n) : plain.format(Math.round(n))
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m}m ${s}s` : `${s}s`
}

export function formatPercent(n: number) {
  return `${Math.round(n)}%`
}

/** Relative change in percent; `null` when there is nothing to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return current ? null : 0
  return ((current - previous) / previous) * 100
}

export function formatChange(change: number) {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±"
  return `${sign}${Math.abs(change).toFixed(1)} %`
}

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/** Compact axis ticks so 4-digit values fit narrow chart axes (1600 → "1.6K"). */
export function formatAxis(value: number) {
  if (Math.abs(value) >= 1_000_000)
    return `${Number((value / 1_000_000).toFixed(1))}M`
  if (Math.abs(value) >= 1000) return `${Number((value / 1000).toFixed(1))}K`
  return String(value)
}

/**
 * Builds a safe absolute URL for a tracked page. Hostname and path come from tracker data, which anyone
 * can send to /api/send, so only http(s) URLs on the website's configured domain (or a subdomain) pass.
 */
export function safeSiteUrl(
  domain: string,
  hostname: string | null | undefined,
  path: string | null | undefined
) {
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  )
    return null
  const site = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
  const host = (hostname || site).toLowerCase()
  if (host !== site && !host.endsWith(`.${site}`)) return null
  try {
    const url = new URL(path, `https://${host}`)
    return url.protocol === "https:" && url.hostname === host
      ? url.toString()
      : null
  } catch {
    return null
  }
}

/** True when `url` is an http(s) URL whose host is the website's domain or one of its subdomains. */
export function isOnSiteDomain(url: string, domain: string) {
  try {
    const u = new URL(url)
    const site = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
    const host = u.hostname.toLowerCase()
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      (host === site || host.endsWith(`.${site}`))
    )
  } catch {
    return false
  }
}
