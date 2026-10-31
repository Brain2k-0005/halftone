import { useState } from "react"
import { toast } from "sonner"
import {
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/app/ui-kit"
import { useApiMutation } from "@/lib/api-client"
import { useEntityOptions } from "./entities"
import {
  BOARD_TYPE_LABELS,
  ENTITY_LABELS,
  getBoardEntity,
  getBoardType,
  setBoardEntity,
  type Board,
  type BoardType,
  type EntityType,
} from "./model"

const INVALIDATE = ["/boards", "/teams"]

/** Create a board, or rename / re-describe an existing one (type and bound entity are fixed after creation). */
export function BoardFormDialog({
  board,
  teamId,
  open,
  onOpenChange,
  onSaved,
}: {
  board?: Board
  teamId: string | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (board: Board) => void
}) {
  const [type, setType] = useState<BoardType>(
    board ? getBoardType(board) : "mixed"
  )
  const [entityId, setEntityId] = useState(
    board ? (getBoardEntity(board).entityId ?? "") : ""
  )
  const entityType = type === "mixed" ? undefined : (type as EntityType)
  const options = useEntityOptions(
    entityType ?? "website",
    board?.teamId ?? teamId,
    !!entityType && !board
  )
  const save = useApiMutation<Record<string, unknown>, Board>(
    "POST",
    board ? `/boards/${board.id}` : "/boards",
    INVALIDATE
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={board ? "Edit board" : "Create board"}
      submitLabel={board ? "Save" : "Create"}
      onSubmit={async (data) => {
        const name = String(data.get("name") ?? "").trim()
        if (!name) throw new Error("Name is required")
        if (!board && entityType && !entityId)
          throw new Error(`Select a ${ENTITY_LABELS[entityType].toLowerCase()}`)
        const description = String(data.get("description") ?? "").trim()
        const body: Record<string, unknown> = board
          ? { name, description }
          : {
              name,
              description,
              type,
              parameters: setBoardEntity(
                { rows: [] },
                type,
                entityId || undefined
              ),
            }
        if (!board && teamId) body.teamId = teamId
        const saved = await save.mutateAsync(body)
        toast.success(board ? "Saved" : "Board created")
        onSaved?.(saved)
      }}
    >
      <TextField
        label="Name"
        name="name"
        defaultValue={board?.name ?? ""}
        autoComplete="off"
        autoFocus
        required
        maxLength={100}
      />
      <TextAreaField
        label="Description"
        name="description"
        defaultValue={board?.description ?? ""}
        maxLength={500}
      />
      {!board && (
        <>
          <SelectField
            label="Board type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as BoardType)
              setEntityId("")
            }}
            hint={
              type === "mixed"
                ? "Mix widgets from any website, link or pixel."
                : `All widgets of this board read from one ${ENTITY_LABELS[type as EntityType].toLowerCase()}.`
            }
            options={(Object.keys(BOARD_TYPE_LABELS) as BoardType[]).map(
              (k) => ({ value: k, label: BOARD_TYPE_LABELS[k] })
            )}
          />
          {entityType && (
            <SelectField
              label={ENTITY_LABELS[entityType]}
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              options={[
                {
                  value: "",
                  label: `Select ${ENTITY_LABELS[entityType].toLowerCase()}…`,
                },
                ...(options.data?.data ?? []).map((e) => ({
                  value: e.id,
                  label: e.name,
                })),
              ]}
            />
          )}
        </>
      )}
    </FormDialog>
  )
}
