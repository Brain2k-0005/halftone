import { createFileRoute } from "@tanstack/react-router"
import { BoardPage, loadBoard } from "@/components/boards/board-pages"
import { validateWebsiteSearch } from "@/lib/website-query"

export const Route = createFileRoute("/_app/boards/$boardId")({
  // Date range for the widgets, plus `?edit=true` for the layout editor.
  validateSearch: (s: Record<string, unknown>) => ({
    ...validateWebsiteSearch(s),
    ...(s.edit === true || s.edit === "true" ? { edit: true as const } : {}),
  }),
  loader: ({ params }) => loadBoard(params.boardId),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.board.name ?? "Board"} · Halftone` }],
  }),
  component: BoardRoute,
})

function BoardRoute() {
  const { board } = Route.useLoaderData()
  const { edit } = Route.useSearch()
  return <BoardPage key={board.id} board={board} edit={!!edit} />
}
