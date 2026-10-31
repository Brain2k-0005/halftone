import { useNavigate } from "@tanstack/react-router"
import {
  FilterIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Pill, SectionCard, Segmented } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDialog,
  PageHeader,
  Pagination,
  SelectField,
  TextField,
  type Column,
} from "@/components/app/ui-kit"
import { api, useApi, type Paged } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { FILTER_FIELDS, OPERATORS } from "@/lib/website-query"

/*
 * CRUD for saved segments (named filter sets) and cohorts (filters + date range + a defining action).
 * Applying one navigates to the website dashboard with `?segment=<id>` / `?cohort=<id>`.
 */

export type SegmentKind = "segment" | "cohort"

interface FilterRow {
  name: string
  operator: string
  value: string
}

interface SegmentParameters {
  filters?: FilterRow[]
  match?: "all" | "any"
  dateRange?: string
  action?: { type: string; value: string }
}

interface Segment {
  id: string
  name: string
  type: SegmentKind
  parameters: SegmentParameters
  createdAt: string
}

const DATE_RANGES = [
  { value: "24hour", label: "Last 24 hours" },
  { value: "7day", label: "Last 7 days" },
  { value: "30day", label: "Last 30 days" },
  { value: "90day", label: "Last 90 days" },
  { value: "6month", label: "Last 6 months" },
  { value: "12month", label: "Last 12 months" },
]

const ACTION_TYPES = [
  { value: "path", label: "Viewed page" },
  { value: "event", label: "Triggered event" },
]

const CONTROL =
  "h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-[13px] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"

const PAGE_SIZE = 20

const fieldLabel = (key: string) =>
  FILTER_FIELDS.find((f) => f.key === key)?.label ?? key
const operatorLabel = (key: string) =>
  OPERATORS.find((o) => o.key === key)?.label ?? key
const rangeLabel = (key?: string) =>
  DATE_RANGES.find((r) => r.value === key)?.label ?? key ?? "–"

const COPY = {
  segment: {
    title: "Segments",
    noun: "segment",
    description: "Save filter combinations and reuse them on every report.",
    empty:
      "Segments you create show up here. Save a set of filters once, then apply it with one click.",
  },
  cohort: {
    title: "Cohorts",
    noun: "cohort",
    description:
      "Group visitors who performed an action in a date range, then analyse them together.",
    empty:
      "Cohorts you create show up here. Define a group of visitors by what they did and when.",
  },
} as const

function FilterEditor({
  rows,
  onChange,
  exclude,
}: {
  rows: FilterRow[]
  onChange: (rows: FilterRow[]) => void
  exclude: string[]
}) {
  const fields = FILTER_FIELDS.filter((f) => !exclude.includes(f.key))
  const update = (i: number, patch: Partial<FilterRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="grid gap-2">
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">No filters yet.</p>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[9rem_9rem_1fr_auto]"
        >
          <select
            aria-label="Field"
            value={r.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className={CONTROL}
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Operator"
            value={r.operator}
            onChange={(e) => update(i, { operator: e.target.value })}
            className={CONTROL}
          >
            {OPERATORS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Value"
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Value"
            required
            className={`${CONTROL} col-span-2 sm:col-span-1`}
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove filter"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="col-span-2 justify-self-end sm:col-span-1"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div>
        <Button
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              { name: fields[0]?.key ?? "path", operator: "eq", value: "" },
            ])
          }
        >
          <PlusIcon /> Add filter
        </Button>
      </div>
    </div>
  )
}

function SegmentEditor({
  websiteId,
  kind,
  segment,
  open,
  onOpenChange,
}: {
  websiteId: string
  kind: SegmentKind
  segment: Segment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  const p = segment?.parameters
  const [name, setName] = useState(segment?.name ?? "")
  const [filters, setFilters] = useState<FilterRow[]>(p?.filters ?? [])
  const [match, setMatch] = useState<"all" | "any">(p?.match ?? "all")
  const [dateRange, setDateRange] = useState(p?.dateRange ?? "30day")
  const [actionType, setActionType] = useState(p?.action?.type ?? "path")
  const [actionValue, setActionValue] = useState(p?.action?.value ?? "")
  const copy = COPY[kind]

  const submit = async () => {
    if (!name.trim()) throw new Error("Name is required")
    if (kind === "segment" && filters.length === 0)
      throw new Error("Add at least one filter")
    if (kind === "cohort" && !actionValue.trim())
      throw new Error("Enter the page or event that defines the cohort")
    const parameters: SegmentParameters = {
      filters: filters.map((f) => ({ ...f, value: f.value.trim() })),
      match: match === "any" ? "any" : undefined,
      ...(kind === "cohort"
        ? { dateRange, action: { type: actionType, value: actionValue.trim() } }
        : {}),
    }
    const body = { type: kind, name: name.trim(), parameters }
    await api(
      "POST",
      `/websites/${websiteId}/segments${segment ? `/${segment.id}` : ""}`,
      undefined,
      body
    )
    await client.invalidateQueries({
      queryKey: ["api", `/websites/${websiteId}/segments`],
    })
    toast.success(
      segment
        ? `${copy.title.slice(0, -1)} updated`
        : `${copy.title.slice(0, -1)} created`
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={segment ? `Edit ${copy.noun}` : `New ${copy.noun}`}
      description={copy.description}
      submitLabel={segment ? "Save changes" : `Create ${copy.noun}`}
      onSubmit={submit}
      wide
    >
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={200}
        autoFocus
        required
      />

      {kind === "cohort" && (
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr]">
          <SelectField
            label="Action"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            options={ACTION_TYPES}
          />
          <TextField
            label={actionType === "event" ? "Event name" : "Page path"}
            value={actionValue}
            onChange={(e) => setActionValue(e.target.value)}
            placeholder={actionType === "event" ? "signup" : "/pricing"}
            required
          />
          <SelectField
            label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={DATE_RANGES}
          />
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium">Filters</span>
          {filters.length > 1 && (
            <Segmented
              value={match}
              onChange={setMatch}
              options={[
                { value: "all", label: "Match all" },
                { value: "any", label: "Match any" },
              ]}
            />
          )}
        </div>
        <FilterEditor
          rows={filters}
          onChange={setFilters}
          exclude={kind === "cohort" ? ["path", "event"] : []}
        />
      </div>
    </FormDialog>
  )
}

export function SegmentManager({
  websiteId,
  kind,
}: {
  websiteId: string
  kind: SegmentKind
}) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const copy = COPY[kind]
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Segment | "new" | null>(null)
  const [deleting, setDeleting] = useState<Segment | null>(null)
  const { data, isLoading, error } = useApi<Paged<Segment>>(
    `/websites/${websiteId}/segments`,
    { type: kind, page, pageSize: PAGE_SIZE },
    { placeholderData: (prev) => prev }
  )

  const apply = (s: Segment) =>
    navigate({
      to: "/websites/$websiteId",
      params: { websiteId },
      search: { [kind]: s.id } as never,
    })

  const columns: Column<Segment>[] = [
    {
      key: "name",
      header: "Name",
      cell: (s) => <span className="font-medium">{s.name}</span>,
    },
    ...(kind === "cohort"
      ? ([
          {
            key: "action",
            header: "Action",
            cell: (s) =>
              s.parameters.action ? (
                <span className="truncate">
                  {s.parameters.action.type === "event" ? "Event" : "Viewed"}{" "}
                  <span className="font-mono text-xs">
                    {s.parameters.action.value}
                  </span>
                </span>
              ) : (
                "–"
              ),
          },
          {
            key: "range",
            header: "Date range",
            cell: (s) => rangeLabel(s.parameters.dateRange),
          },
        ] satisfies Column<Segment>[])
      : []),
    {
      key: "filters",
      header: "Filters",
      cell: (s) =>
        s.parameters.filters?.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {s.parameters.filters.slice(0, 3).map((f, i) => (
              <Pill key={i} className="max-w-56 font-normal">
                <span className="truncate">
                  {fieldLabel(f.name)} {operatorLabel(f.operator)} {f.value}
                </span>
              </Pill>
            ))}
            {s.parameters.filters.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{s.parameters.filters.length - 3}
              </span>
            )}
            {s.parameters.filters.length > 1 &&
              s.parameters.match === "any" && (
                <span className="text-xs text-muted-foreground">(any)</span>
              )}
          </div>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    },
    {
      key: "created",
      header: "Created",
      cell: (s) => (
        <span className="text-muted-foreground">
          {new Date(s.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-40",
      cell: (s) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="sm" onClick={() => apply(s)}>
            <PlayIcon /> Apply
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Edit ${s.name}`}
            onClick={() => setEditing(s)}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete ${s.name}`}
            onClick={() => setDeleting(s)}
          >
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ]

  const Icon = kind === "segment" ? FilterIcon : UsersRoundIcon

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <PlusIcon /> New {copy.noun}
          </Button>
        }
      />
      <SectionCard
        dither
        title={`Saved ${copy.title.toLowerCase()}`}
        description={data ? `${data.count} total` : undefined}
      >
        <DataTable
          columns={columns}
          rows={data?.data}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          error={error}
          onRowClick={apply}
          empty={
            <EmptyState
              icon={Icon}
              title={`No ${copy.title.toLowerCase()} yet`}
              description={copy.empty}
              action={
                <Button variant="primary" onClick={() => setEditing("new")}>
                  <PlusIcon /> New {copy.noun}
                </Button>
              }
            />
          }
        />
        {data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            count={data.count}
            onPage={setPage}
          />
        )}
      </SectionCard>

      {editing && (
        <SegmentEditor
          key={editing === "new" ? "new" : editing.id}
          websiteId={websiteId}
          kind={kind}
          segment={editing === "new" ? null : editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${copy.noun}?`}
        description={
          deleting
            ? `"${deleting.name}" will be removed permanently.`
            : undefined
        }
        onConfirm={async () => {
          if (!deleting) return
          await api("DELETE", `/websites/${websiteId}/segments/${deleting.id}`)
          await client.invalidateQueries({
            queryKey: ["api", `/websites/${websiteId}/segments`],
          })
          toast.success(
            `${copy.noun[0]!.toUpperCase()}${copy.noun.slice(1)} deleted`
          )
        }}
      />
    </div>
  )
}
