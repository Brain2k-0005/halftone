import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  FormDialog,
  SelectField,
  TextField,
} from "@/components/app/ui-kit"
import type { WebsiteInfo } from "@/components/behavior/website-info"
import { api, useApi, type Paged } from "@/lib/api-client"

function Row({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="max-w-xl text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

/** Dialog that makes the user type a word before the destructive action runs. */
function TypeToConfirm({
  open,
  onOpenChange,
  title,
  description,
  word,
  label,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  word: string
  label: string
  onConfirm: () => Promise<unknown>
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitLabel={label}
      onSubmit={async (data) => {
        if (String(data.get("confirm") ?? "").trim() !== word)
          throw new Error(`Type ${word} to confirm`)
        await onConfirm()
      }}
    >
      <TextField
        label={`Type ${word} to confirm`}
        name="confirm"
        autoComplete="off"
        autoFocus
        required
      />
    </FormDialog>
  )
}

export function DataCard({ website }: { website: WebsiteInfo }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [dialog, setDialog] = useState<"transfer" | "reset" | "delete" | null>(
    null
  )
  const close = (o: boolean) => !o && setDialog(null)
  const { data: me } = useApi<{ user: { id: string } }>("/me")
  const { data: teams } = useApi<Paged<{ id: string; name: string }>>(
    "/me/teams",
    { pageSize: 100 }
  )
  const isTeamWebsite = !!website.teamId
  const canTransfer = isTeamWebsite ? !!me : !!teams?.data.length

  const refresh = () => client.invalidateQueries({ queryKey: ["api"] })

  return (
    <>
      <SectionCard
        title="Danger zone"
        description="These actions affect all data of this website."
        className="border-destructive/30"
      >
        <div className="divide-y border-t">
          <Row
            title="Transfer website"
            description={
              isTeamWebsite
                ? "Move this website from its team back to your personal account."
                : "Move this website to one of your teams so its members can access it."
            }
            action={
              <Button
                disabled={!canTransfer}
                onClick={() => setDialog("transfer")}
              >
                Transfer
              </Button>
            }
          />
          <Row
            title="Reset data"
            description="Delete all collected analytics data. The website and its settings stay in place."
            action={
              <Button onClick={() => setDialog("reset")}>Reset data</Button>
            }
          />
          <Row
            title="Delete website"
            description="Permanently delete this website with all its data, segments and share links. This cannot be undone."
            action={
              <Button variant="danger" onClick={() => setDialog("delete")}>
                Delete website
              </Button>
            }
          />
        </div>
      </SectionCard>

      {dialog === "transfer" && (
        <FormDialog
          open
          onOpenChange={close}
          title="Transfer website"
          description={
            isTeamWebsite
              ? "The website becomes a personal website of your account."
              : "Choose the team that should own this website."
          }
          submitLabel="Transfer"
          onSubmit={async (data) => {
            const teamId = String(data.get("teamId") ?? "")
            if (!isTeamWebsite && !teamId) throw new Error("Select a team")
            await api(
              "POST",
              `/websites/${website.id}/transfer`,
              undefined,
              isTeamWebsite ? { userId: me?.user.id } : { teamId }
            )
            await refresh()
            toast.success("Website transferred")
            navigate({ to: "/websites" })
          }}
        >
          {!isTeamWebsite && (
            <SelectField
              label="Team"
              name="teamId"
              defaultValue=""
              options={[
                { value: "", label: "Select a team …" },
                ...(teams?.data ?? []).map((t) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
            />
          )}
        </FormDialog>
      )}

      <TypeToConfirm
        open={dialog === "reset"}
        onOpenChange={close}
        title="Reset website data"
        description={`All pageviews, sessions and events of ${website.name} will be deleted permanently.`}
        word="RESET"
        label="Reset data"
        onConfirm={async () => {
          await api("POST", `/websites/${website.id}/reset`)
          await refresh()
          toast.success("Website data reset")
        }}
      />

      <TypeToConfirm
        open={dialog === "delete"}
        onOpenChange={close}
        title="Delete website"
        description={`${website.name} and all of its data will be deleted permanently.`}
        word="DELETE"
        label="Delete website"
        onConfirm={async () => {
          await api("DELETE", `/websites/${website.id}`)
          await refresh()
          toast.success("Website deleted")
          navigate({ to: "/websites" })
        }}
      />
    </>
  )
}
