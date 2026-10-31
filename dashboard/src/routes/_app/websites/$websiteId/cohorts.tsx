import { createFileRoute } from "@tanstack/react-router"
import { SegmentManager } from "@/components/behavior/segment-manager"

export const Route = createFileRoute("/_app/websites/$websiteId/cohorts")({
  staticData: { crumb: { label: "Cohorts", icon: "website" } },
  component: CohortsPage,
})

function CohortsPage() {
  const { websiteId } = Route.useParams()
  return <SegmentManager websiteId={websiteId} kind="cohort" />
}
