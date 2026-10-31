import { createFileRoute } from "@tanstack/react-router"
import { KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  CopyField,
  DataTable,
  EmptyState,
  FormDialog,
  TextField,
} from "@/components/app/ui-kit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiDelete, apiPost, useApi } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"

export const Route = createFileRoute("/_app/settings/api-keys")({
  staticData: { crumb: { label: "API keys", icon: "overview" } },
  head: () => ({ meta: [{ title: "API keys · Halftone" }] }),
  component: ApiKeysPage,
})

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

const date = (v: string) =>
  new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })

function ApiKeysPage() {
  const client = useQueryClient()
  const { data, isLoading, error } = useApi<ApiKey[]>("/me/api-keys")
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ApiKey | null>(null)
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["api", "/me/api-keys"] })

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="API keys"
        description="Keys let scripts and integrations call the Umami API as you."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon />
            Create key
          </Button>
        }
      >
        <DataTable<ApiKey>
          rows={data}
          rowKey={(k) => k.id}
          isLoading={isLoading}
          error={
            error?.status === 404
              ? new Error("API keys are not enabled on this server.")
              : error
          }
          empty={
            <EmptyState
              icon={KeyRoundIcon}
              title="No API keys"
              description="Create a key to access the API programmatically."
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (k) => <span className="font-medium">{k.name}</span>,
            },
            {
              key: "key",
              header: "Key",
              cell: (k) => (
                <code className="font-mono text-xs text-muted-foreground">
                  {k.keyPrefix}…
                </code>
              ),
            },
            {
              key: "created",
              header: "Created",
              cell: (k) => date(k.createdAt),
            },
            {
              key: "used",
              header: "Last used",
              cell: (k) =>
                k.lastUsedAt ? (
                  date(k.lastUsedAt)
                ) : (
                  <span className="text-muted-foreground">Never</span>
                ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              cell: (k) => (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete key"
                  onClick={() => setDeleting(k)}
                >
                  <Trash2Icon />
                </Button>
              ),
            },
          ]}
        />
      </SectionCard>

      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="Create API key"
        submitLabel="Create"
        onSubmit={async (data) => {
          const res = await apiPost<{ key: string }>("/me/api-keys", {
            name: String(data.get("name") ?? "").trim(),
          })
          setCreated(res.key)
          await refresh()
        }}
      >
        <TextField
          label="Name"
          name="name"
          required
          maxLength={255}
          autoComplete="off"
          autoFocus
        />
      </FormDialog>

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="grid gap-5">
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                Copy the key now. For security it is shown only once and cannot
                be retrieved later.
              </DialogDescription>
            </DialogHeader>
            {created && <CopyField value={created} />}
            <DialogFooter>
              <Button variant="primary" onClick={() => setCreated(null)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete API key"
        description={
          <>
            Delete <b>{deleting?.name}</b>? Anything using this key will stop
            working.
          </>
        }
        onConfirm={async () => {
          await apiDelete(`/me/api-keys/${deleting!.id}`)
          await refresh()
          toast.success("API key deleted")
        }}
      />
    </div>
  )
}
