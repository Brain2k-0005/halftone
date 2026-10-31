import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The ReUI dashboard card: hairline border, dotted dither surface, a header with
 * title + description and optional actions, and an optional footer bar.
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  dither = true,
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
        "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
        dither && "bg-dither",
        className
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm leading-5 font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  )
}

/** Segmented control — the "Week | Month | 90 D | All" switch from ReUI dashboards. */
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
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-6 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active &&
                "bg-background text-foreground shadow-xs ring-1 ring-border dark:bg-accent"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
