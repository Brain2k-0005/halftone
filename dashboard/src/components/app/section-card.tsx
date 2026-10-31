import type { ReactNode } from "react"
import { Dither } from "@/components/app/dither"
import { cn } from "@/lib/utils"

/*
 * ReUI-style building blocks (same look as the Foto Waschbaer dashboard): card with header,
 * segmented switch, delta pill, sparkline and progress bar. Colours come only from tokens (light/dark).
 */

export function SectionCard({
  title,
  description,
  actions,
  footer,
  dither = false,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  dither?: boolean
  className?: string
  bodyClassName?: string
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-xs",
        dither && "dither",
        className
      )}
    >
      {dither && <Dither />}
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm leading-tight font-semibold">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-b-xl border-t bg-card/60 px-5 py-3 text-[13px]">
          {footer}
        </div>
      )}
    </section>
  )
}

/** Switch like "Week | Month | Year". */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center rounded-lg bg-muted p-0.5",
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
            o.value === value
              ? "bg-card text-foreground shadow-xs ring-1 ring-black/5 dark:ring-white/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export type Tone =
  "neutral" | "success" | "warning" | "danger" | "info" | "brand"

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success-soft text-success border-[var(--success-line)]",
  warning: "bg-warning-soft text-warning border-[var(--warning-line)]",
  danger: "bg-danger-soft text-destructive border-[var(--danger-line)]",
  info: "bg-info-soft text-info border-[var(--info-line)]",
  brand:
    "bg-brand-soft text-brand-deep border-[color-mix(in_oklab,var(--brand)_30%,transparent)]",
}

export function Pill({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

/** Change as a small pill: green when up, orange for a slight drop, red from -10 %. `good` flips the meaning. */
export function DeltaPill({
  value,
  invert = false,
}: {
  value: number
  invert?: boolean
}) {
  const v = invert ? -value : value
  const tone: Tone =
    v > 0 ? "success" : v === 0 ? "neutral" : v > -10 ? "warning" : "danger"
  return (
    <Pill tone={tone} className="tabular px-1.5 py-px text-[11px]">
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value).toFixed(1)} %
    </Pill>
  )
}

/** Small line without axes; at least two points. */
export function Sparkline({
  values,
  tone = "success",
  className,
}: {
  values: number[]
  tone?: "success" | "warning" | "danger" | "brand"
  className?: string
}) {
  if (values.length < 2) return <div className={cn("h-8 w-24", className)} />
  const W = 96
  const H = 32
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`
  )
  const color = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--destructive)",
    brand: "var(--brand)",
  }[tone]
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-24 shrink-0", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function Progress({
  percent,
  className,
}: {
  percent: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
      />
    </div>
  )
}
