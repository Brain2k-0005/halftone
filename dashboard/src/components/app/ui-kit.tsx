import { CheckIcon, CopyIcon, LoaderCircleIcon, type LucideIcon } from "lucide-react"
import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/*
 * Shared building blocks for every page of the dashboard, in the style of the Foto Waschbaer dashboard.
 * Use these instead of ad-hoc markup so all areas look the same:
 *   PageHeader, Button, IconTile, EmptyState, LoadingRows, DataTable, Pagination,
 *   FormDialog, ConfirmDialog, TextField, TextAreaField, SelectField, CopyField, ErrorText
 */

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl leading-tight font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const BUTTON = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-xs",
  outline: "border bg-card text-foreground hover:bg-accent shadow-xs",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  danger: "bg-destructive text-white hover:opacity-90 shadow-xs",
}

export function Button({
  variant = "outline",
  size = "default",
  loading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof BUTTON
  size?: "sm" | "default" | "icon"
  loading?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        size === "sm" && "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        size === "default" && "h-8 px-3 text-[13px]",
        size === "icon" && "size-8",
        BUTTON[variant],
        className
      )}
    >
      {loading && <LoaderCircleIcon className="animate-spin" />}
      {children}
    </button>
  )
}

/** Square violet tile for list rows (like the event rows in the reference). */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep",
        className
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      {Icon && (
        <span className="mb-1 flex size-10 items-center justify-center rounded-xl border bg-background text-muted-foreground">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y border-t">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorText({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null
  return (
    <p className={cn("px-5 py-10 text-center text-sm text-destructive", className)}>
      {error instanceof Error ? error.message : String(error)}
    </p>
  )
}

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  /** Right-align numbers. */
  align?: "left" | "right"
}

/** Plain table inside a card body: header row, hairline rows, optional row click. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  error,
  empty,
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  error?: unknown
  empty?: ReactNode
}) {
  if (error) return <ErrorText error={error} className="border-t" />
  if (isLoading) return <LoadingRows />
  if (!rows?.length) return <div className="border-t">{empty ?? <EmptyState title="Nothing here yet" />}</div>

  return (
    <div className="overflow-x-auto border-t">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b bg-[color-mix(in_oklab,var(--card)_96%,var(--foreground))]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "h-9 px-5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground",
                  c.align === "right" && "text-right",
                  c.className
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-accent/40")}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn("h-12 px-5 align-middle", c.align === "right" && "tabular text-right", c.className)}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number
  pageSize: number
  count: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (count <= pageSize) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-[13px] text-muted-foreground">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} of {count}
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

const FIELD =
  "w-full rounded-lg border border-input bg-background px-3 text-[13px] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"

export function TextField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: ReactNode }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      <input {...props} className={cn(FIELD, "h-9")} />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: ReactNode }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      <textarea {...props} className={cn(FIELD, "min-h-24 py-2")} />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** Native select styled like the inputs (simple and form-friendly). */
export function SelectField({
  label,
  options,
  hint,
  className,
  ...props
}: ComponentProps<"select"> & { label: string; options: { value: string; label: string }[]; hint?: ReactNode }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      <select {...props} className={cn(FIELD, "h-9")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function CopyField({ label, value, multiline }: { label?: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="grid gap-1.5">
      {label && <span className="text-[13px] font-medium">{label}</span>}
      <div className="relative">
        {multiline ? (
          <textarea readOnly value={value} className={cn(FIELD, "min-h-24 py-2 pr-10 font-mono text-xs")} />
        ) : (
          <input readOnly value={value} className={cn(FIELD, "h-9 pr-10 font-mono text-xs")} />
        )}
        <button
          type="button"
          onClick={copy}
          aria-label="Copy"
          className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

/** Dialog with a form: `onSubmit` receives the FormData; throw to keep the dialog open (error shown as toast). */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  children,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  onSubmit: (data: FormData) => Promise<unknown> | void
  children: ReactNode
  wide?: boolean
}) {
  const [pending, setPending] = useState(false)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    try {
      await onSubmit(new FormData(e.currentTarget))
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4">{children}</div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  danger = true,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => Promise<unknown> | void
}) {
  const [pending, setPending] = useState(false)
  const confirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void confirm()
            }}
            className={danger ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {pending && <LoaderCircleIcon className="size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Underlined tabs for sub-areas (settings, admin, reports) – like the reference's area tabs. */
export function AreaTabs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex shrink-0 items-center gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {children}
    </div>
  )
}

export const AREA_TAB =
  "relative inline-flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] font-medium whitespace-nowrap transition-colors text-muted-foreground hover:text-foreground data-[status=active]:text-foreground data-[status=active]:after:absolute data-[status=active]:after:inset-x-2 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-foreground"
