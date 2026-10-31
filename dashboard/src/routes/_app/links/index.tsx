import { createFileRoute } from "@tanstack/react-router"
import { EntityListPage } from "@/components/links/entity"

export const Route = createFileRoute("/_app/links/")({
  staticData: { crumb: { label: "Links", icon: "websites" } },
  head: () => ({ meta: [{ title: "Links · Halftone" }] }),
  component: () => <EntityListPage kind="link" />,
})
