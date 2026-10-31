import { useId, useState } from "react"
import { SelectField, TextField } from "@/components/app/ui-kit"
import { useApi } from "@/lib/api-client"
import { useWebsiteQuery } from "@/lib/website-query"

/** Saved goal / funnel as returned by `/websites/:id/goals` and `/funnels`. */
export interface Definition<P> {
  id: string
  name: string
  description?: string | null
  parameters: P
  createdAt: string
}

export const STEP_TYPES = [
  { value: "path", label: "Page" },
  { value: "event", label: "Event" },
]

export function formatMoney(value: number, currency: string, compact = false) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : Math.abs(value) >= 1000 ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

/** Page / event select plus a value input that suggests known paths or event names. */
export function TypedValueFields({
  websiteId,
  typeName,
  valueName,
  defaultType = "path",
  defaultValue = "",
  label,
}: {
  websiteId: string
  typeName: string
  valueName: string
  defaultType?: string
  defaultValue?: string
  label?: string
}) {
  const [type, setType] = useState(defaultType)
  return (
    <div className="grid grid-cols-[7rem_1fr] items-end gap-3">
      <SelectField
        label={label ? `${label} type` : "Type"}
        name={typeName}
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={STEP_TYPES}
      />
      <ValueInput
        websiteId={websiteId}
        type={type === "event" ? "event" : "path"}
        name={valueName}
        defaultValue={defaultValue}
        label={label ?? "Value"}
        required
      />
    </div>
  )
}

/** Text input with a datalist of the website's known paths / event names. */
export function ValueInput({
  websiteId,
  type,
  label,
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof TextField>, "type" | "value"> & {
  websiteId: string
  type: "path" | "event"
  value?: string
  onValueChange?: (value: string) => void
}) {
  const listId = useId()
  const { dates } = useWebsiteQuery()
  const { data } = useApi<{ value: string }[]>(
    `/websites/${websiteId}/values`,
    {
      type,
      startAt: dates.startAt,
      endAt: dates.endAt,
    }
  )
  return (
    <>
      <TextField
        label={label}
        list={listId}
        autoComplete="off"
        placeholder={type === "event" ? "event-name" : "/path"}
        {...props}
        {...(onValueChange
          ? {
              value: value ?? "",
              onChange: (e) => onValueChange(e.target.value),
            }
          : {})}
      />
      <datalist id={listId}>
        {data?.slice(0, 100).map((v) => (
          <option key={v.value} value={v.value} />
        ))}
      </datalist>
    </>
  )
}
