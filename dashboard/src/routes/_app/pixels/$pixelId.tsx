import { createFileRoute } from "@tanstack/react-router"
import { EntityDetailPage, loadEntity } from "@/components/links/entity"
import { validateWebsiteSearch } from "@/lib/website-query"

export const Route = createFileRoute("/_app/pixels/$pixelId")({
  validateSearch: validateWebsiteSearch,
  loader: ({ params }) => loadEntity("pixel", params.pixelId),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity.name ?? "Pixel"} · Umami` }],
  }),
  component: PixelPage,
})

function PixelPage() {
  const { entity } = Route.useLoaderData()
  return <EntityDetailPage key={entity.id} kind="pixel" entity={entity} />
}
