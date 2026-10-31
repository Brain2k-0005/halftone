import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Pill, SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/app/ui-kit"
import { cn } from "@/lib/utils"
import {
  ENTITY_LABELS,
  getBoardType,
  MAX_COLUMNS,
  resolveEntity,
  type Board,
  type BoardColumn,
  type BoardRow,
} from "./model"
import { getWidget } from "./registry"

export interface CanvasEditor {
  onMoveRow: (rowId: string, delta: -1 | 1) => void
  onRemoveRow: (rowId: string) => void
  onAddColumn: (rowId: string) => void
  onRemoveColumn: (rowId: string, columnId: string) => void
  onSizeColumn: (rowId: string, columnId: string, size: number) => void
  onPick: (rowId: string, column: BoardColumn) => void
  onRemoveWidget: (rowId: string, columnId: string) => void
}

function Widget({
  board,
  column,
  names,
  rowId,
  editor,
}: {
  board: Pick<Board, "type" | "parameters">
  column: BoardColumn
  names: Map<string, string>
  rowId: string
  editor?: CanvasEditor
}) {
  const component = column.component
  if (!component) {
    if (!editor) return null
    return (
      <button
        type="button"
        onClick={() => editor.onPick(rowId, column)}
        className="flex min-h-40 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/40 hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add widget
      </button>
    )
  }

  const widget = getWidget(component.type)
  const { entityType, entityId } = resolveEntity(board, component)
  const needsEntity = widget?.requiresEntity !== false
  const entityName = entityId ? names.get(entityId) : undefined

  let body
  if (!widget) {
    body = (
      <Placeholder>
        "{component.type}" widgets aren't available in this dashboard yet.
      </Placeholder>
    )
  } else if (needsEntity && !entityId) {
    body = (
      <Placeholder>
        Select a{" "}
        {entityType
          ? ENTITY_LABELS[entityType].toLowerCase()
          : "website, link or pixel"}
        .
      </Placeholder>
    )
  } else if (needsEntity && names.size && !entityName) {
    body = <Placeholder>The selected item is no longer available.</Placeholder>
  } else {
    body = widget.render({
      id: entityId ?? "",
      entityType,
      props: { ...widget.defaultProps, ...component.props },
    })
  }

  const showBadge = getBoardType(board) === "mixed" && entityName && needsEntity
  return (
    <SectionCard
      className="h-full"
      title={component.title || (editor ? widget?.name : undefined)}
      description={component.description}
      actions={
        (showBadge || editor) && (
          <>
            {showBadge && (
              <Pill className="max-w-40 truncate" tone="neutral">
                {entityName}
              </Pill>
            )}
            {editor && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Edit widget"
                  onClick={() => editor.onPick(rowId, column)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Remove widget"
                  onClick={() => editor.onRemoveWidget(rowId, column.id)}
                >
                  <Trash2Icon />
                </Button>
              </>
            )}
          </>
        )
      }
    >
      <div className={cn(!component.title && !editor && !showBadge && "pt-4")}>
        {body}
      </div>
    </SectionCard>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-32 items-center justify-center px-5 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** Rows of widgets; with `editor` it also shows the layout controls. */
export function BoardCanvas({
  board,
  rows,
  names,
  editor,
}: {
  board: Pick<Board, "type" | "parameters">
  rows: BoardRow[]
  names: Map<string, string>
  editor?: CanvasEditor
}) {
  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className={cn(
            "flex flex-col gap-2",
            editor && "rounded-xl border border-dashed p-3"
          )}
        >
          {editor && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Row {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label="Move row up"
                  onClick={() => editor.onMoveRow(row.id, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === rows.length - 1}
                  aria-label="Move row down"
                  onClick={() => editor.onMoveRow(row.id, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={row.columns.length >= MAX_COLUMNS}
                  onClick={() => editor.onAddColumn(row.id)}
                >
                  <PlusIcon /> Column
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove row"
                  onClick={() => editor.onRemoveRow(row.id)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-5 lg:flex-row">
            {row.columns.map((column) => (
              <div
                key={column.id}
                className="flex min-w-0 flex-col gap-1.5"
                style={{ flex: `${column.size ?? 1} 1 0%` }}
              >
                {editor && (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1.5">
                      Width
                      <select
                        value={column.size ?? 1}
                        onChange={(e) =>
                          editor.onSizeColumn(
                            row.id,
                            column.id,
                            Number(e.target.value)
                          )
                        }
                        className="h-6 rounded-md border bg-background px-1 text-xs"
                      >
                        {[1, 2, 3].map((s) => (
                          <option key={s} value={s}>
                            {s}x
                          </option>
                        ))}
                      </select>
                    </label>
                    {row.columns.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remove column"
                        onClick={() => editor.onRemoveColumn(row.id, column.id)}
                        className="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <Widget
                  board={board}
                  column={column}
                  names={names}
                  rowId={row.id}
                  editor={editor}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
