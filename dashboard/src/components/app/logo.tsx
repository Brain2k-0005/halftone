/*
 * The Halftone mark: a 7×7 print raster clipped to a circle, dots shrinking toward the bottom right.
 * Drawn in the theme's accent (--brand), so it follows the selected theme.
 */
const DOTS = Array.from({ length: 49 }, (_, i) => {
  const x = i % 7
  const y = Math.floor(i / 7)
  const cx = 4 + x * 4
  const cy = 4 + y * 4
  return { cx, cy, r: 0.4 + 1.6 * (1 - (x + y) / 12) }
}).filter((d) => (d.cx - 16) ** 2 + (d.cy - 16) ** 2 <= 15 ** 2)

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {DOTS.map((d) => (
        <circle key={`${d.cx}-${d.cy}`} cx={d.cx} cy={d.cy} r={d.r.toFixed(2)} fill="var(--brand)" />
      ))}
    </svg>
  )
}
