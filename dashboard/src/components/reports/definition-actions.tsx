import { PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button, ConfirmDialog } from "@/components/app/ui-kit"
import { useApiMutation } from "@/lib/api-client"

/** Edit + delete buttons for a saved goal / funnel; `deletePath` is the definition's API path. */
export function DefinitionActions({
  name,
  deletePath,
  onEdit,
}: {
  name: string
  deletePath: string
  onEdit: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const remove = useApiMutation<void>("DELETE", deletePath)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${name}`}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${name}`}
        onClick={() => setConfirm(true)}
      >
        <Trash2Icon />
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete "${name}"?`}
        description="This removes the saved definition. Your tracked data is not affected."
        onConfirm={async () => {
          await remove.mutateAsync()
          toast.success("Deleted")
        }}
      />
    </>
  )
}
