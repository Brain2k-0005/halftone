import { createFileRoute, Outlet } from "@tanstack/react-router"
import { websiteFn } from "@/lib/api"
import { validateWebsiteSearch } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId")({
  // Date range + filters for every website page (see lib/website-query.ts).
  validateSearch: validateWebsiteSearch,
  loader: async ({ params }) => {
    const website = await websiteFn({ data: params.websiteId })
    return {
      website,
      crumb: {
        label: website.name,
        to: "/websites/$websiteId",
        params: { websiteId: website.id },
        icon: "website" as const,
      },
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.website.name ?? "Website"} · Halftone` }],
  }),
  component: Outlet,
})
