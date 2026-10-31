import { useNavigate } from "@tanstack/react-router"
import {
  ExternalLinkIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ChartBlock, MetricTabs, StatsBlock } from "@/components/boards/blocks"
import { DateRangeControl } from "@/components/app/website-controls"
import { SectionCard, Sparkline } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  CopyField,
  DataTable,
  EmptyState,
  FormDialog,
  IconTile,
  PageHeader,
  Pagination,
  TextField,
  type Column,
} from "@/components/app/ui-kit"
import { apiGet, useApi, useApiMutation, type Paged } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { resolveWebsiteQuery } from "@/lib/website-query"
import { randomSlug, scopedPath, useHosts, useTeamId } from "./shared"

/*
 * Links (short links with click tracking) and pixels (tracking pixels) share one implementation:
 * both are `{ id, name, slug, createdAt }` entities, a link additionally has a destination `url`.
 */

export type EntityKind = "link" | "pixel"

export interface SlugEntity {
  id: string
  name: string
  slug: string
  url?: string
  teamId?: string | null
  createdAt: string
}

interface KindConfig {
  kind: EntityKind
  singular: string
  plural: string
  base: "/links" | "/pixels"
  icon: LucideIcon
  description: string
}

export const KINDS: Record<EntityKind, KindConfig> = {
  link: {
    kind: "link",
    singular: "link",
    plural: "Links",
    base: "/links",
    icon: LinkIcon,
    description:
      "Short links that count every click and show where visitors come from.",
  },
  pixel: {
    kind: "pixel",
    singular: "pixel",
    plural: "Pixels",
    base: "/pixels",
    icon: LinkIcon,
    description:
      "Tracking pixels for places where you can't run a script, like emails.",
  },
}

function useSlugUrl(kind: EntityKind) {
  const hosts = useHosts()
  const host = kind === "link" ? hosts.linksUrl : hosts.pixelsUrl
  return (slug: string) => `${host}/${slug}`
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** The embed snippet for a pixel. */
export function pixelSnippet(url: string) {
  return `<img src="${url}" width="1" height="1" alt="" style="display:none" />`
}

function EntityFormDialog({
  config,
  entity,
  teamId,
  open,
  onOpenChange,
  onSaved,
}: {
  config: KindConfig
  entity?: SlugEntity
  teamId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const isLink = config.kind === "link"
  const [slug, setSlug] = useState(() => entity?.slug ?? randomSlug())
  const slugUrl = useSlugUrl(config.kind)
  const save = useApiMutation<Record<string, unknown>>(
    "POST",
    entity ? `${config.base}/${entity.id}` : config.base,
    [config.base, "/teams"]
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${entity ? "Edit" : "Create"} ${config.singular}`}
      submitLabel={entity ? "Save" : "Create"}
      onSubmit={async (data) => {
        const name = String(data.get("name") ?? "").trim()
        const url = String(data.get("url") ?? "").trim()
        if (!name) throw new Error("Name is required")
        if (isLink && !isValidUrl(url))
          throw new Error("Enter a valid URL starting with http:// or https://")
        if (slug.length < 8)
          throw new Error("The slug needs at least 8 characters")
        const body: Record<string, unknown> = { name, slug }
        if (isLink) body.url = url
        if (!entity && teamId) body.teamId = teamId
        await save.mutateAsync(body)
        toast.success(
          entity
            ? "Saved"
            : `${config.singular[0]!.toUpperCase()}${config.singular.slice(1)} created`
        )
        onSaved?.()
      }}
    >
      <TextField
        label="Name"
        name="name"
        defaultValue={entity?.name ?? ""}
        autoComplete="off"
        autoFocus
        required
        maxLength={100}
      />
      {isLink && (
        <TextField
          label="Destination URL"
          name="url"
          type="url"
          defaultValue={entity?.url ?? ""}
          placeholder="https://example.com"
          autoComplete="off"
          required
          maxLength={500}
        />
      )}
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <TextField
          label="Slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
          }
          autoComplete="off"
          minLength={8}
          maxLength={100}
          required
        />
        <Button
          aria-label="Generate a new slug"
          size="icon"
          onClick={() => setSlug(randomSlug())}
        >
          <RefreshCwIcon />
        </Button>
      </div>
      <CopyField
        label={isLink ? "Short link" : "Pixel URL"}
        value={slugUrl(slug)}
      />
    </FormDialog>
  )
}

function useDeleteEntity(config: KindConfig, id: string) {
  const del = useApiMutation("DELETE", `${config.base}/${id}`, [
    config.base,
    "/teams",
  ])
  return async () => {
    await del.mutateAsync(undefined)
    toast.success(
      `${config.singular[0]!.toUpperCase()}${config.singular.slice(1)} deleted`
    )
  }
}

function DeleteDialog({
  config,
  entity,
  open,
  onOpenChange,
  onDeleted,
}: {
  config: KindConfig
  entity: SlugEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const remove = useDeleteEntity(config, entity.id)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${config.singular}`}
      description={`"${entity.name}" and all of its statistics will be removed. This can't be undone.`}
      onConfirm={async () => {
        await remove()
        onDeleted?.()
      }}
    />
  )
}

interface ChartsResponse {
  data: Record<string, { values: number[]; total: number }>
}

const PAGE_SIZE = 20

/** List page: search, sparkline of the last 7 days, create / edit / delete. */
export function EntityListPage({ kind }: { kind: EntityKind }) {
  const config = KINDS[kind]
  const navigate = useNavigate()
  const teamId = useTeamId()
  const slugUrl = useSlugUrl(kind)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SlugEntity | null>(null)
  const [deleting, setDeleting] = useState<SlugEntity | null>(null)

  const path = scopedPath(teamId, config.base)
  const { data, isLoading, error } = useApi<Paged<SlugEntity>>(path, {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    orderBy: "createdAt",
    sortDescending: "true",
  })

  const ids = useMemo(
    () => (data?.data ?? []).map((r) => r.id).join(","),
    [data]
  )
  const { dates } = useMemo(() => resolveWebsiteQuery({ range: "7d" }), [])
  const { data: charts } = useApi<ChartsResponse>(
    ids ? `${config.base}/charts` : null,
    {
      ids,
      startAt: dates.startAt,
      endAt: dates.endAt,
      timezone: dates.timezone,
    }
  )

  const columns: Column<SlugEntity>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <IconTile icon={config.icon} className="size-8" />
          <span className="truncate font-semibold">{r.name}</span>
        </div>
      ),
    },
    {
      key: "slug",
      header: kind === "link" ? "Short link" : "Pixel URL",
      cell: (r) => (
        <span className="block max-w-64 truncate text-muted-foreground">
          {slugUrl(r.slug)}
        </span>
      ),
    },
  ]
  if (kind === "link") {
    columns.push({
      key: "url",
      header: "Destination",
      cell: (r) => (
        <span className="block max-w-64 truncate text-muted-foreground">
          {r.url}
        </span>
      ),
    })
  }
  columns.push(
    {
      key: "chart",
      header: "Last 7 days",
      cell: (r) => {
        const chart = charts?.data[r.id]
        return (
          <div className="flex items-center gap-3">
            <Sparkline
              values={chart?.values ?? []}
              tone="brand"
              className="h-6 w-20"
            />
            <span className="tabular w-10 text-right font-semibold">
              {chart ? formatNumber(chart.total) : "–"}
            </span>
          </div>
        )
      },
    },
    {
      key: "created",
      header: "Created",
      cell: (r) => (
        <span className="text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit"
            onClick={() => setEditing(r)}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete"
            onClick={() => setDeleting(r)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ),
    }
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={config.plural}
        description={config.description}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon /> Create {config.singular}
          </Button>
        }
      />
      <SectionCard
        title={config.plural}
        description={
          data
            ? `${data.count} ${data.count === 1 ? config.singular : config.plural.toLowerCase()}`
            : undefined
        }
        actions={
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search"
              aria-label="Search"
              className="h-7 w-44 rounded-lg border bg-background pr-2.5 pl-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        }
      >
        <DataTable
          columns={columns}
          rows={data?.data}
          rowKey={(r) => r.id}
          isLoading={isLoading || teamId === undefined}
          error={error}
          onRowClick={(r) =>
            navigate({
              to: kind === "link" ? "/links/$linkId" : "/pixels/$pixelId",
              params: { linkId: r.id, pixelId: r.id } as never,
            })
          }
          empty={
            <EmptyState
              icon={config.icon}
              title={
                search ? "No results" : `No ${config.plural.toLowerCase()} yet`
              }
              description={
                search ? "Try a different search term." : config.description
              }
              action={
                !search && (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <PlusIcon /> Create {config.singular}
                  </Button>
                )
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

      {creating && (
        <EntityFormDialog
          config={config}
          teamId={teamId}
          open
          onOpenChange={setCreating}
        />
      )}
      {editing && (
        <EntityFormDialog
          config={config}
          entity={editing}
          teamId={teamId}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteDialog
          config={config}
          entity={deleting}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
        />
      )}
    </div>
  )
}

export async function loadEntity(kind: EntityKind, id: string) {
  const config = KINDS[kind]
  const entity = await apiGet<SlugEntity>(`${config.base}/${id}`)
  return {
    entity,
    crumb: {
      label: entity.name,
      to: kind === "link" ? "/links/$linkId" : "/pixels/$pixelId",
      params: kind === "link" ? { linkId: id } : { pixelId: id },
      icon: "website" as const,
    },
  }
}

const SOURCES = [
  { value: "referrer", label: "Referrers" },
  { value: "channel", label: "Channels" },
]
const ENVIRONMENT = [
  { value: "browser", label: "Browsers" },
  { value: "os", label: "OS" },
  { value: "device", label: "Devices" },
]
const LOCATION = [
  { value: "country", label: "Countries" },
  { value: "region", label: "Regions" },
  { value: "city", label: "Cities" },
]

/** Detail page: stats, traffic chart and the top lists the original shows for links and pixels. */
export function EntityDetailPage({
  kind,
  entity,
}: {
  kind: EntityKind
  entity: SlugEntity
}) {
  const config = KINDS[kind]
  const navigate = useNavigate()
  const slugUrl = useSlugUrl(kind)
  const teamId = useTeamId()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const url = slugUrl(entity.slug)

  // The loader fetched the entity once; the query keeps the page in sync after an edit.
  const { data: fresh } = useApi<SlugEntity>(
    `${config.base}/${entity.id}`,
    undefined,
    { initialData: entity }
  )
  const current = fresh ?? entity

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={current.name}
        description={kind === "link" ? current.url : url}
        actions={
          <>
            <DateRangeControl />
            <Button onClick={() => setEditing(true)}>
              <PencilIcon /> Edit
            </Button>
            {kind === "link" && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs transition-colors hover:bg-accent"
              >
                <ExternalLinkIcon className="size-4" /> Open
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
            </Button>
          </>
        }
      />

      <SectionCard
        dither
        title="Overview"
        description={
          kind === "link"
            ? "Clicks on your short link"
            : "Loads of your tracking pixel"
        }
      >
        <StatsBlock id={entity.id} full={false} />
      </SectionCard>

      {kind === "pixel" && (
        <SectionCard
          title="Embed"
          description="Add this snippet to an email or page. Every load counts as a view."
        >
          <div className="grid gap-4 border-t px-5 py-4">
            <CopyField label="Pixel URL" value={url} />
            <CopyField
              label="HTML snippet"
              value={pixelSnippet(url)}
              multiline
            />
          </div>
        </SectionCard>
      )}
      {kind === "link" && (
        <SectionCard
          title="Short link"
          description="Share this URL. Visitors are redirected to the destination."
        >
          <div className="grid gap-4 border-t px-5 py-4 md:grid-cols-2">
            <CopyField label="Short link" value={url} />
            <CopyField label="Destination" value={current.url ?? ""} />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Traffic" description="Views and visitors over time">
        <ChartBlock id={entity.id} />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Sources" description="Where visitors come from">
          <MetricTabs id={entity.id} tabs={SOURCES} />
        </SectionCard>
        <SectionCard
          title="Environment"
          description="Browser, system and device"
        >
          <MetricTabs id={entity.id} tabs={ENVIRONMENT} />
        </SectionCard>
        <SectionCard
          title="Location"
          description="Where visitors are located"
          className="lg:col-span-2"
        >
          <MetricTabs id={entity.id} tabs={LOCATION} />
        </SectionCard>
      </div>

      {editing && (
        <EntityFormDialog
          config={config}
          entity={current}
          teamId={teamId}
          open
          onOpenChange={setEditing}
        />
      )}
      {deleting && (
        <DeleteDialog
          config={config}
          entity={current}
          open
          onOpenChange={setDeleting}
          onDeleted={() =>
            navigate({ to: kind === "link" ? "/links" : "/pixels" })
          }
        />
      )}
    </div>
  )
}
