import { createFileRoute } from "@tanstack/react-router"
import { RouteIcon } from "lucide-react"
import { useState } from "react"
import { Segmented, SectionCard } from "@/components/app/section-card"
import {
  EmptyState,
  ErrorText,
  PageHeader,
  SelectField,
  Skeleton,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { ValueInput } from "@/components/reports/common"
import {
  JourneyFlow,
  type JourneyPath,
} from "@/components/reports/journey-flow"
import { useApi } from "@/lib/api-client"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/journeys")({
  staticData: { crumb: { label: "Journeys", icon: "website" } },
  component: JourneysPage,
})

type View = "all" | "views" | "events"
const EVENT_TYPE: Record<View, number | undefined> = {
  all: undefined,
  views: 1,
  events: 2,
}
const STEP_OPTIONS = [2, 3, 4, 5, 6, 7].map((n) => ({
  value: String(n),
  label: `${n} steps`,
}))

function JourneysPage() {
  const { websiteId } = Route.useParams()
  const { query } = useWebsiteQuery()
  const [view, setView] = useState<View>("all")
  const [steps, setSteps] = useState(3)
  const [startStep, setStartStep] = useState("")
  const [endStep, setEndStep] = useState("")
  const stepType = view === "events" ? "event" : "path"

  const { data, isLoading, error } = useApi<JourneyPath[]>(
    `/websites/${websiteId}/journeys`,
    {
      ...query,
      steps,
      startStep: startStep.trim() || undefined,
      endStep: endStep.trim() || undefined,
      eventType: EVENT_TYPE[view],
    }
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Journeys"
        description="Follow the paths visitors take through your site, step by step."
      />
      <WebsiteToolbar />
      <SectionCard
        title="User journeys"
        description="Click a node to follow the visitors who passed through it."
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "All" },
              { value: "views", label: "Views" },
              { value: "events", label: "Events" },
            ]}
          />
        }
      >
        <div className="grid gap-3 border-t px-5 py-4 sm:grid-cols-3">
          <SelectField
            label="Steps"
            value={String(steps)}
            onChange={(e) => setSteps(Number(e.target.value))}
            options={STEP_OPTIONS}
          />
          <ValueInput
            websiteId={websiteId}
            type={stepType}
            label="Start step"
            value={startStep}
            onValueChange={setStartStep}
          />
          <ValueInput
            websiteId={websiteId}
            type={stepType}
            label="End step"
            value={endStep}
            onValueChange={setEndStep}
          />
        </div>
        <div className="border-t pt-4">
          {error ? (
            <ErrorText error={error} />
          ) : isLoading ? (
            <div className="px-5 pb-5">
              <Skeleton className="h-96 w-full" />
            </div>
          ) : !data?.length ? (
            <EmptyState
              icon={RouteIcon}
              title="No journeys found"
              description="Try a wider date range or clear the start and end step."
            />
          ) : (
            <JourneyFlow paths={data} steps={steps} />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
