import { createFileRoute } from "@tanstack/react-router"
import { BoardsListPage } from "@/components/boards/board-pages"

export const Route = createFileRoute("/_app/boards/")({
  staticData: { crumb: { label: "Boards", icon: "overview" } },
  head: () => ({ meta: [{ title: "Boards · Halftone" }] }),
  component: BoardsListPage,
})
