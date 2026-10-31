import { useNavigate } from "@tanstack/react-router"
import {
  CopyIcon,
  LayoutDashboardIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { DateRangeControl } from "@/components/app/website-controls"
import { Pill, SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
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
import { scopedPath, useTeamId } from "@/components/links/shared"
import { BoardFormDialog } from "./board-dialogs"
import { BoardCanvas, type CanvasEditor } from "./canvas"
import { useEntityNames } from "./entities"
import {
  BOARD_TYPE_LABELS,
  emptyRow,
  getBoardType,
  MAX_COLUMNS,
  uid,
  type Board,
  type BoardColumn,
  type BoardComponent,
  type BoardRow,
} from "./model"
import { WidgetDialog } from "./widget-dialog"

const INVALIDATE = ["/boards", "/teams"]
const PAGE_SIZE = 20

export function BoardsListPage() {
  const navigate = useNavigate()
  const teamId = useTeamId()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Board | null>(null)
  const [cloning, setCloning] = useState<Board | null>(null)
  const [deleting, setDeleting] = useState<Board | null>(null)

  const { data, isLoading, error } = useApi<Paged<Board>>(
    scopedPath(teamId, "/boards"),
    {
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      orderBy: "createdAt",
      sortDescending: "true",
    }
  )

  const clone = useApiMutation<{ name: string }>(
    "POST",
    `/boards/${cloning?.id ?? "-"}/clone`,
    INVALIDATE
  )
  const remove = useApiMutation(
    "DELETE",
    `/boards/${deleting?.id ?? "-"}`,
    INVALIDATE
  )

  const open = (b: Board, edit?: boolean) =>
    navigate({
      to: "/boards/$boardId",
      params: { boardId: b.id },
      search: edit ? { edit: true } : {},
    } as never)

  const columns: Column<Board>[] = [
    {
      key: "name",
      header: "Name",
      cell: (b) => (
        <div className="flex items-center gap-3">
          <IconTile icon={LayoutDashboardIcon} className="size-8" />
          <span className="truncate font-semibold">{b.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (b) => (
        <span className="block max-w-72 truncate text-muted-foreground">
          {b.description}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (b) => <Pill>{BOARD_TYPE_LABELS[getBoardType(b)]}</Pill>,
    },
    {
      key: "created",
      header: "Created",
      cell: (b) => (
        <span className="text-muted-foreground">
          {new Date(b.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (b) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Design board"
            onClick={() => open(b, true)}
          >
            <SettingsIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rename board"
            onClick={() => setEditing(b)}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Duplicate board"
            onClick={() => setCloning(b)}
          >
            <CopyIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete board"
            onClick={() => setDeleting(b)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Boards"
        description="Custom dashboards composed of widgets from your websites, links and pixels."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon /> Create board
          </Button>
        }
      />
      <SectionCard
        title="Boards"
        description={
          data
            ? `${data.count} ${data.count === 1 ? "board" : "boards"}`
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
          rowKey={(b) => b.id}
          isLoading={isLoading || teamId === undefined}
          error={error}
          onRowClick={(b) => open(b)}
          empty={
            <EmptyState
              icon={LayoutDashboardIcon}
              title={search ? "No results" : "No boards yet"}
              description={
                search
                  ? "Try a different search term."
                  : "Create a board and arrange widgets in rows and columns."
              }
              action={
                !search && (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <PlusIcon /> Create board
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
        <BoardFormDialog
          teamId={teamId}
          open
          onOpenChange={setCreating}
          onSaved={(b) => open(b, true)}
        />
      )}
      {editing && (
        <BoardFormDialog
          board={editing}
          teamId={teamId}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {cloning && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setCloning(null)}
          title="Duplicate board"
          submitLabel="Duplicate"
          onSubmit={async (data) => {
            await clone.mutateAsync({
              name:
                String(data.get("name") ?? "").trim() ||
                `${cloning.name} (copy)`,
            })
            toast.success("Board duplicated")
          }}
        >
          <TextField
            label="Name"
            name="name"
            defaultValue={`${cloning.name} (copy)`}
            autoFocus
            required
            maxLength={100}
          />
        </FormDialog>
      )}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title="Delete board"
          description={`"${deleting.name}" will be removed. The websites, links and pixels it shows are not affected.`}
          onConfirm={async () => {
            await remove.mutateAsync(undefined)
            toast.success("Board deleted")
          }}
        />
      )}
    </div>
  )
}

export async function loadBoard(boardId: string) {
  const board = await apiGet<Board>(`/boards/${boardId}`)
  return {
    board,
    crumb: {
      label: board.name,
      to: "/boards/$boardId",
      params: { boardId },
      icon: "website" as const,
    },
  }
}

type Picking = { rowId: string; column: BoardColumn } | null

/** Viewer, and with `edit` the layout editor (rows, columns, widgets). */
export function BoardPage({
  board: loaded,
  edit,
}: {
  board: Board
  edit: boolean
}) {
  const navigate = useNavigate()
  const { data } = useApi<Board>(`/boards/${loaded.id}`, undefined, {
    initialData: loaded,
  })
  const board = data ?? loaded
  const { names } = useEntityNames(board.teamId ?? null)
  const [draft, setDraft] = useState<BoardRow[] | null>(null)
  const [picking, setPicking] = useState<Picking>(null)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const save = useApiMutation<{ parameters: Board["parameters"] }>(
    "POST",
    `/boards/${board.id}`,
    INVALIDATE
  )
  const remove = useApiMutation("DELETE", `/boards/${board.id}`, INVALIDATE)

  const saved = board.parameters?.rows ?? []
  const rows = edit ? (draft ?? saved) : saved

  const setEdit = (on: boolean) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const { edit: _edit, ...rest } = prev
        return on ? { ...rest, edit: true } : rest
      },
    } as never)

  const update = (fn: (rows: BoardRow[]) => BoardRow[]) =>
    setDraft(fn(draft ?? saved))
  const mapRow = (rowId: string, fn: (row: BoardRow) => BoardRow) =>
    update((r) => r.map((row) => (row.id === rowId ? fn(row) : row)))
  const mapColumn = (
    rowId: string,
    columnId: string,
    fn: (c: BoardColumn) => BoardColumn
  ) =>
    mapRow(rowId, (row) => ({
      ...row,
      columns: row.columns.map((c) => (c.id === columnId ? fn(c) : c)),
    }))

  const editor: CanvasEditor = {
    onMoveRow: (rowId, delta) =>
      update((r) => {
        const i = r.findIndex((row) => row.id === rowId)
        const j = i + delta
        if (i < 0 || j < 0 || j >= r.length) return r
        const next = [...r]
        ;[next[i], next[j]] = [next[j]!, next[i]!]
        return next
      }),
    onRemoveRow: (rowId) => update((r) => r.filter((row) => row.id !== rowId)),
    onAddColumn: (rowId) =>
      mapRow(rowId, (row) =>
        row.columns.length >= MAX_COLUMNS
          ? row
          : {
              ...row,
              columns: [...row.columns, { id: uid(), component: null }],
            }
      ),
    onRemoveColumn: (rowId, columnId) =>
      mapRow(rowId, (row) => ({
        ...row,
        columns: row.columns.filter((c) => c.id !== columnId),
      })),
    onSizeColumn: (rowId, columnId, size) =>
      mapColumn(rowId, columnId, (c) => ({ ...c, size })),
    onPick: (rowId, column) => setPicking({ rowId, column }),
    onRemoveWidget: (rowId, columnId) =>
      mapColumn(rowId, columnId, (c) => ({ ...c, component: null })),
  }

  const applyWidget = (component: BoardComponent) => {
    if (picking)
      mapColumn(picking.rowId, picking.column.id, (c) => ({ ...c, component }))
    setPicking(null)
  }

  const startEdit = () => {
    setDraft(null)
    void setEdit(true)
  }
  const cancel = () => {
    setDraft(null)
    void setEdit(false)
  }
  const persist = async () => {
    await save.mutateAsync({ parameters: { ...board.parameters, rows } })
    toast.success("Board saved")
    setDraft(null)
    void setEdit(false)
  }

  const type = getBoardType(board)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={board.name}
        description={
          <>
            {board.description || `${BOARD_TYPE_LABELS[type]} board`}
            {board.description && ` · ${BOARD_TYPE_LABELS[type]} board`}
          </>
        }
        actions={
          edit ? (
            <>
              <Button onClick={() => setRenaming(true)}>
                <PencilIcon /> Rename
              </Button>
              <Button onClick={cancel}>Cancel</Button>
              <Button
                variant="primary"
                loading={save.isPending}
                onClick={persist}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <DateRangeControl />
              <Button onClick={startEdit}>
                <SettingsIcon /> Design
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete board"
                onClick={() => setDeleting(true)}
              >
                <Trash2Icon />
              </Button>
            </>
          )
        }
      />

      {edit && (
        <div className="flex justify-end">
          <DateRangeControl />
        </div>
      )}

      {rows.length === 0 && !edit ? (
        <SectionCard>
          <EmptyState
            icon={LayoutDashboardIcon}
            title="This board is empty"
            description="Add rows and widgets in the designer."
            action={
              <Button variant="primary" onClick={startEdit}>
                <SettingsIcon /> Design board
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <BoardCanvas
          board={board}
          rows={rows}
          names={names}
          editor={edit ? editor : undefined}
        />
      )}

      {edit && (
        <Button
          className="self-start"
          onClick={() => update((r) => [...r, emptyRow()])}
        >
          <PlusIcon /> Add row
        </Button>
      )}

      {picking && (
        <WidgetDialog
          board={board}
          teamId={board.teamId ?? null}
          initial={picking.column.component}
          onSave={applyWidget}
          onClose={() => setPicking(null)}
        />
      )}
      {renaming && (
        <BoardFormDialog
          board={board}
          teamId={board.teamId ?? null}
          open
          onOpenChange={setRenaming}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={setDeleting}
          title="Delete board"
          description={`"${board.name}" will be removed.`}
          onConfirm={async () => {
            await remove.mutateAsync(undefined)
            toast.success("Board deleted")
            await navigate({ to: "/boards" })
          }}
        />
      )}
    </div>
  )
}
