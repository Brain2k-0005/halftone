import { useParams } from "@tanstack/react-router"
import { CalendarIcon, FilterIcon, PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Segmented } from "@/components/app/section-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApi } from "@/lib/api-client"
import { RANGES, type RangeKey } from "@/lib/range"
import { cn } from "@/lib/utils"
import {
  FILTER_FIELDS,
  OPERATORS,
  parseFilter,
  useSetWebsiteSearch,
  useWebsiteQuery,
  type FilterField,
  type Operator,
} from "@/lib/website-query"

const RANGE_OPTIONS = (Object.keys(RANGES) as RangeKey[]).map((value) => ({
  value,
  label: RANGES[value].label,
}))

const toDateInput = (ms: number) =>
  new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)

/** Presets ("24h | Week | Month | 90 D | Year") plus a custom range popover, bound to the URL. */
export function DateRangeControl() {
  const { range, custom, dates } = useWebsiteQuery()
  const set = useSetWebsiteSearch()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(toDateInput(dates.startAt))
  const [to, setTo] = useState(toDateInput(dates.endAt))

  const applyCustom = () => {
    const startAt = new Date(`${from}T00:00:00`).getTime()
    const endAt = new Date(`${to}T23:59:59.999`).getTime()
    if (startAt < endAt) set({ startAt, endAt, range: undefined })
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Segmented
        value={custom ? ("" as RangeKey) : range}
        options={RANGE_OPTIONS}
        onChange={(r) =>
          set({ range: r, startAt: undefined, endAt: undefined })
        }
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium shadow-xs transition-colors hover:bg-accent",
                custom ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-3.5" />
              {custom
                ? `${new Date(dates.startAt).toLocaleDateString()} – ${new Date(dates.endAt).toLocaleDateString()}`
                : "Custom"}
            </button>
          }
        />
        <PopoverContent align="end" className="w-64">
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={applyCustom}
              className="h-8 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const fieldLabel = (key: string) =>
  FILTER_FIELDS.find((f) => f.key === key)?.label ?? key
const operatorLabel = (key: string) =>
  OPERATORS.find((o) => o.key === key)?.label ?? key

function AddFilter({ websiteId }: { websiteId: string }) {
  const set = useSetWebsiteSearch()
  const { dates } = useWebsiteQuery()
  const [open, setOpen] = useState(false)
  const [field, setField] = useState<FilterField>("path")
  const [operator, setOperator] = useState<Operator>("eq")
  const [value, setValue] = useState("")
  const { data: suggestions } = useApi<{ value: string }[]>(
    open ? `/websites/${websiteId}/values` : null,
    { type: field, ...dates, search: value || undefined },
    { staleTime: 60_000 }
  )

  const apply = (v = value) => {
    if (!v.trim()) return
    set({ [field]: `${operator}.${v.trim()}` })
    setValue("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-dashed px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PlusIcon className="size-3.5" /> Filter
          </button>
        }
      />
      <PopoverContent align="start" className="w-80">
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={field}
              onValueChange={(v) => setField(v as FilterField)}
              items={FILTER_FIELDS.map((f) => ({
                value: f.key,
                label: f.label,
              }))}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={operator}
              onValueChange={(v) => setOperator(v as Operator)}
              items={OPERATORS.map((o) => ({ value: o.key, label: o.label }))}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Value …"
            className="h-8 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {!!suggestions?.length && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border">
              {suggestions.slice(0, 20).map((s) => (
                <li key={s.value}>
                  <button
                    type="button"
                    onClick={() => apply(String(s.value))}
                    className="w-full truncate px-2.5 py-1.5 text-left text-[13px] hover:bg-accent"
                  >
                    {String(s.value) || "(none)"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => apply()}
            className="h-8 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add filter
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Active filter chips + "Filter" button. Pages put it above their content. */
export function FilterBar({ className }: { className?: string }) {
  const { websiteId } = useParams({ strict: false }) as { websiteId?: string }
  const { filters } = useWebsiteQuery()
  const set = useSetWebsiteSearch()
  const active = Object.entries(filters).filter(
    ([k]) => k !== "segment" && k !== "cohort"
  )

  if (!websiteId) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {active.length > 0 && (
        <FilterIcon className="size-3.5 text-muted-foreground" />
      )}
      {active.map(([key, raw]) => {
        const { operator, value } = parseFilter(raw)
        return (
          <span
            key={key}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border bg-card pr-1 pl-2.5 text-xs shadow-xs"
          >
            <span className="text-muted-foreground">{fieldLabel(key)}</span>
            <span className="text-muted-foreground">
              {operatorLabel(operator)}
            </span>
            <span className="max-w-48 truncate font-medium">{value}</span>
            <button
              type="button"
              onClick={() => set({ [key]: undefined })}
              aria-label={`Remove ${fieldLabel(key)} filter`}
              className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        )
      })}
      <AddFilter websiteId={websiteId} />
      {active.length > 1 && (
        <button
          type="button"
          onClick={() =>
            set(Object.fromEntries(active.map(([k]) => [k, undefined])))
          }
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

/** The standard toolbar row of a website page: filters left, date range right. */
export function WebsiteToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterBar />
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <DateRangeControl />
      </div>
    </div>
  )
}
