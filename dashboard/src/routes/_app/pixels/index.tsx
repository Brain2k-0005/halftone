import { createFileRoute } from "@tanstack/react-router"
import { EntityListPage } from "@/components/links/entity"

export const Route = createFileRoute("/_app/pixels/")({
  staticData: { crumb: { label: "Pixels", icon: "websites" } },
  head: () => ({ meta: [{ title: "Pixels · Umami" }] }),
  component: () => <EntityListPage kind="pixel" />,
})
