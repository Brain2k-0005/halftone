import { useQueryClient } from "@tanstack/react-query"
import {
  ExternalLinkIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDialog,
  TextField,
  type Column,
} from "@/components/app/ui-kit"
import { Checkbox } from "@/components/ui/checkbox"
import { api, useApi, type Paged } from "@/lib/api-client"

interface Share {
  id: string
  name: string
  slug: string
  parameters: Record<string, boolean | string | undefined> | null
  createdAt: string
}

const SECTIONS = [
  {
    title: "Traffic",
    items: [
      "overview",
      "events",
      "sessions",
      "realtime",
      "performance",
      "compare",
      "breakdown",
    ],
  },
  { title: "Behavior", items: ["goals", "funnels", "journeys", "retention"] },
  { title: "Growth", items: ["utm", "revenue", "attribution"] },
]

const DEFAULT_ON = new Set(["overview", "events"])
const label = (id: string) => id[0]!.toUpperCase() + id.slice(1)
/** Share pages are served by this dashboard (routes/share/$slug.tsx), not by the Umami server. */
const shareUrl = (slug: string) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/share/${slug}`

function ShareDialog({
  websiteId,
  share,
  onClose,
}: {
  websiteId: string
  share: Share | null
  onClose: () => void
}) {
  const client = useQueryClient()
  const p = share?.parameters ?? {}
  const [name, setName] = useState(share?.name ?? "")
  const [allowFilter, setAllowFilter] = useState(p.allowFilter !== false)
  const [pages, setPages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SECTIONS.flatMap((s) => s.items).map((id) => [
        id,
        p[id] === undefined ? DEFAULT_ON.has(id) : p[id] === true,
      ])
    )
  )

  const submit = async () => {
    const parameters = { ...pages, allowFilter }
    if (share)
      await api("POST", `/share/id/${share.id}`, undefined, {
        name: name.trim(),
        slug: share.slug,
        parameters,
      })
    else
      await api("POST", `/websites/${websiteId}/shares`, undefined, {
        name: name.trim(),
        parameters,
      })
    await client.invalidateQueries({
      queryKey: ["api", `/websites/${websiteId}/shares`],
    })
    toast.success(share ? "Share link updated" : "Share link created")
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={share ? "Edit share link" : "New share link"}
      description="Anyone with the link can view the selected pages without signing in."
      submitLabel={share ? "Save changes" : "Create link"}
      onSubmit={submit}
      wide
    >
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={200}
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <fieldset key={s.title} className="grid content-start gap-2">
            <legend className="mb-1 text-[13px] font-medium">{s.title}</legend>
            {s.items.map((id) => (
              <label key={id} className="flex items-center gap-2 text-[13px]">
                <Checkbox
                  checked={pages[id]}
                  onCheckedChange={(v) =>
                    setPages((c) => ({ ...c, [id]: v === true }))
                  }
                />
                {label(id)}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <Checkbox
          checked={allowFilter}
          onCheckedChange={(v) => setAllowFilter(v === true)}
        />
        Allow viewers to filter and change the date range
      </label>
    </FormDialog>
  )
}

export function SharingCard({ websiteId }: { websiteId: string }) {
  const client = useQueryClient()
  const [editing, setEditing] = useState<Share | "new" | null>(null)
  const [deleting, setDeleting] = useState<Share | null>(null)
  const { data, isLoading, error } = useApi<Paged<Share>>(
    `/websites/${websiteId}/shares`,
    { pageSize: 50 }
  )

  const copy = async (slug: string) => {
    await navigator.clipboard.writeText(shareUrl(slug))
    toast.success("Link copied to clipboard")
  }

  const columns: Column<Share>[] = [
    {
      key: "name",
      header: "Name",
      cell: (s) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: "url",
      header: "Link",
      cell: (s) => (
        <span className="block max-w-xs truncate font-mono text-xs text-muted-foreground">
          {shareUrl(s.slug)}
        </span>
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
      className: "w-36",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Copy link"
            onClick={() => copy(s.slug)}
          >
            <LinkIcon />
          </Button>
          <a
            href={shareUrl(s.slug)}
            target="_blank"
            rel="noreferrer"
            aria-label="Open link"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit"
            onClick={() => setEditing(s)}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete"
            onClick={() => setDeleting(s)}
          >
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <SectionCard
      title="Share links"
      description="Public, read-only views of this website."
      actions={
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          <PlusIcon /> Add link
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        error={error}
        empty={
          <EmptyState
            icon={LinkIcon}
            title="No share links"
            description="Create a link to give others read-only access to selected pages."
          />
        }
      />
      {editing && (
        <ShareDialog
          key={editing === "new" ? "new" : editing.id}
          websiteId={websiteId}
          share={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete share link?"
        description={
          deleting
            ? `"${deleting.name}" will stop working immediately.`
            : undefined
        }
        onConfirm={async () => {
          if (!deleting) return
          await api("DELETE", `/share/id/${deleting.id}`)
          await client.invalidateQueries({
            queryKey: ["api", `/websites/${websiteId}/shares`],
          })
          toast.success("Share link deleted")
        }}
      />
    </SectionCard>
  )
}
