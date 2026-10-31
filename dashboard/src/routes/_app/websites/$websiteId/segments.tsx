import { createFileRoute } from "@tanstack/react-router"
import { SegmentManager } from "@/components/behavior/segment-manager"

export const Route = createFileRoute("/_app/websites/$websiteId/segments")({
  staticData: { crumb: { label: "Segments", icon: "website" } },
  component: SegmentsPage,
})

function SegmentsPage() {
  const { websiteId } = Route.useParams()
  return <SegmentManager websiteId={websiteId} kind="segment" />
}
