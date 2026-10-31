import { createFileRoute } from "@tanstack/react-router"
import { EntityDetailPage, loadEntity } from "@/components/links/entity"
import { validateWebsiteSearch } from "@/lib/website-query"

export const Route = createFileRoute("/_app/links/$linkId")({
  validateSearch: validateWebsiteSearch,
  loader: ({ params }) => loadEntity("link", params.linkId),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity.name ?? "Link"} · Umami` }],
  }),
  component: LinkPage,
})

function LinkPage() {
  const { entity } = Route.useLoaderData()
  return <EntityDetailPage key={entity.id} kind="link" entity={entity} />
}
