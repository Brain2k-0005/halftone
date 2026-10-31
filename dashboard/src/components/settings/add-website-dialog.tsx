import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { FormDialog, TextField } from "@/components/app/ui-kit"
import { apiPost } from "@/lib/api-client"

/** Create a website in the personal workspace or, with `teamId`, in a team. */
export function AddWebsiteDialog({
  open,
  onOpenChange,
  teamId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId?: string | null
}) {
  const router = useRouter()
  const client = useQueryClient()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add website"
      description={
        teamId
          ? "The website will belong to the team."
          : "The website will belong to you."
      }
      submitLabel="Add website"
      onSubmit={async (data) => {
        await apiPost("/websites", {
          name: String(data.get("name") ?? "").trim(),
          domain: String(data.get("domain") ?? "").trim(),
          ...(teamId ? { teamId } : {}),
        })
        await client.invalidateQueries({ queryKey: ["api"] })
        await router.invalidate()
        toast.success("Website added")
      }}
    >
      <TextField
        label="Name"
        name="name"
        required
        maxLength={100}
        autoComplete="off"
        autoFocus
      />
      <TextField
        label="Domain"
        name="domain"
        required
        placeholder="example.com"
        hint="Without protocol, e.g. example.com"
        autoComplete="off"
      />
    </FormDialog>
  )
}
