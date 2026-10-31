import { createFileRoute } from "@tanstack/react-router"
import {
  FileTextIcon,
  MousePointerClickIcon,
  PlusIcon,
  TargetIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Pill, Progress, SectionCard } from "@/components/app/section-card"
import {
  Button,
  EmptyState,
  ErrorText,
  FormDialog,
  IconTile,
  PageHeader,
  Skeleton,
  TextField,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { type Definition, TypedValueFields } from "@/components/reports/common"
import { DefinitionActions } from "@/components/reports/definition-actions"
import { type Paged, useApi, useApiMutation } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/goals")({
  staticData: { crumb: { label: "Goals", icon: "website" } },
  component: GoalsPage,
})

interface GoalParameters {
  type: string
  value: string
}
type Goal = Definition<GoalParameters>

function GoalDialog({
  websiteId,
  goal,
  open,
  onOpenChange,
}: {
  websiteId: string
  goal?: Goal
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const base = `/websites/${websiteId}/goals`
  const save = useApiMutation("POST", goal ? `${base}/${goal.id}` : base)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Edit goal" : "Create goal"}
      description="A goal counts the share of visitors who view a page or trigger an event."
      submitLabel={goal ? "Save" : "Create goal"}
      onSubmit={async (f) => {
        await save.mutateAsync({
          name: String(f.get("name")).trim(),
          description: String(f.get("description") ?? "").trim(),
          parameters: {
            type: String(f.get("type")),
            value: String(f.get("value")).trim(),
          },
        })
        toast.success(goal ? "Goal updated" : "Goal created")
      }}
    >
      <TextField
        label="Name"
        name="name"
        defaultValue={goal?.name}
        placeholder="Reached pricing"
        required
        maxLength={200}
      />
      <TextField
        label="Description"
        name="description"
        defaultValue={goal?.description ?? ""}
        maxLength={500}
      />
      <TypedValueFields
        websiteId={websiteId}
        typeName="type"
        valueName="value"
        defaultType={goal?.parameters.type}
        defaultValue={goal?.parameters.value}
        label="Target"
      />
    </FormDialog>
  )
}

function GoalCard({ websiteId, goal }: { websiteId: string; goal: Goal }) {
  const { query } = useWebsiteQuery()
  const [editing, setEditing] = useState(false)
  const { data, isLoading, error } = useApi<{ num: number; total: number }>(
    `/websites/${websiteId}/goals/${goal.id}/stats`,
    query
  )
  const isEvent = goal.parameters.type === "event"
  const percent = data?.total ? (data.num / data.total) * 100 : 0

  return (
    <SectionCard>
      <div className="flex items-start gap-3 px-5 pt-4">
        <IconTile icon={isEvent ? MousePointerClickIcon : FileTextIcon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{goal.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {goal.description || (isEvent ? "Event" : "Page view")}
          </p>
        </div>
        <div className="-mr-2 flex shrink-0 items-center">
          <DefinitionActions
            name={goal.name}
            deletePath={`/websites/${websiteId}/goals/${goal.id}`}
            onEdit={() => setEditing(true)}
          />
        </div>
      </div>
      <div className="px-5 pt-3 pb-5">
        <Pill tone="brand" className="max-w-full truncate font-mono">
          {goal.parameters.value}
        </Pill>
        {error ? (
          <ErrorText error={error} className="px-0" />
        ) : isLoading || !data ? (
          <Skeleton className="mt-4 h-12 w-full" />
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="tabular text-2xl leading-none font-semibold tracking-tight">
                {percent.toFixed(1)}%
              </p>
              <p className="tabular text-xs text-muted-foreground">
                {formatNumber(data.num)} of {formatNumber(data.total)} visitors
              </p>
            </div>
            <Progress className="mt-3" percent={percent} />
          </>
        )}
      </div>
      <GoalDialog
        websiteId={websiteId}
        goal={goal}
        open={editing}
        onOpenChange={setEditing}
      />
    </SectionCard>
  )
}

function GoalsPage() {
  const { websiteId } = Route.useParams()
  const [creating, setCreating] = useState(false)
  const { data, isLoading, error } = useApi<Paged<Goal>>(
    `/websites/${websiteId}/goals`,
    { pageSize: 100 }
  )

  const create = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <PlusIcon />
      Create goal
    </Button>
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Goals"
        description="Track how many visitors reach a page or trigger an event."
        actions={data?.data.length ? create : undefined}
      />
      <WebsiteToolbar />
      {error ? (
        <SectionCard>
          <ErrorText error={error} />
        </SectionCard>
      ) : isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <SectionCard>
          <EmptyState
            icon={TargetIcon}
            title="No goals yet"
            description="Create a goal for a page or event to see its conversion rate."
            action={create}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((goal) => (
            <GoalCard key={goal.id} websiteId={websiteId} goal={goal} />
          ))}
        </div>
      )}
      <GoalDialog
        websiteId={websiteId}
        open={creating}
        onOpenChange={setCreating}
      />
    </div>
  )
}
