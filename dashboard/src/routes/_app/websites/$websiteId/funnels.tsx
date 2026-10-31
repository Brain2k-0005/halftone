import { createFileRoute } from "@tanstack/react-router"
import { FilterIcon, PlusIcon, XIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Pill, SectionCard } from "@/components/app/section-card"
import {
  Button,
  EmptyState,
  ErrorText,
  FormDialog,
  LoadingRows,
  PageHeader,
  SelectField,
  Skeleton,
  TextField,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import {
  type Definition,
  STEP_TYPES,
  ValueInput,
} from "@/components/reports/common"
import { DefinitionActions } from "@/components/reports/definition-actions"
import { FunnelSteps, type FunnelStep } from "@/components/reports/funnel-steps"
import { type Paged, useApi, useApiMutation } from "@/lib/api-client"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/funnels")({
  staticData: { crumb: { label: "Funnels", icon: "website" } },
  component: FunnelsPage,
})

const MAX_STEPS = 8

interface FunnelParameters {
  window: number
  steps: { type: "path" | "event"; value: string }[]
}
type Funnel = Definition<FunnelParameters>

interface StepDraft {
  key: number
  type: string
  value: string
}

function StepRow({
  websiteId,
  index,
  step,
  canRemove,
  onChange,
  onRemove,
}: {
  websiteId: string
  index: number
  step: StepDraft
  canRemove: boolean
  onChange: (patch: Partial<StepDraft>) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1.5rem_7rem_1fr_2rem] items-end gap-2">
      <span className="tabular flex h-9 items-center justify-center text-xs font-semibold text-muted-foreground">
        {index + 1}
      </span>
      <SelectField
        label="Type"
        aria-label={`Step ${index + 1} type`}
        value={step.type}
        onChange={(e) => onChange({ type: e.target.value })}
        options={STEP_TYPES}
      />
      <ValueInput
        websiteId={websiteId}
        type={step.type === "event" ? "event" : "path"}
        label="Value"
        aria-label={`Step ${index + 1} value`}
        value={step.value}
        onValueChange={(value) => onChange({ value })}
        required
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove step ${index + 1}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  )
}

function FunnelDialog({
  websiteId,
  funnel,
  open,
  onOpenChange,
}: {
  websiteId: string
  funnel?: Funnel
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const base = `/websites/${websiteId}/funnels`
  const save = useApiMutation("POST", funnel ? `${base}/${funnel.id}` : base)
  const counter = useRef(0)
  const draft = (): StepDraft[] =>
    funnel
      ? funnel.parameters.steps.map((s) => ({
          key: counter.current++,
          type: s.type,
          value: s.value,
        }))
      : [
          { key: counter.current++, type: "path", value: "" },
          { key: counter.current++, type: "path", value: "" },
        ]
  const [steps, setSteps] = useState<StepDraft[]>(draft)

  return (
    <FormDialog
      wide
      open={open}
      onOpenChange={(o) => {
        if (o) setSteps(draft())
        onOpenChange(o)
      }}
      title={funnel ? "Edit funnel" : "Create funnel"}
      description="Visitors move through the steps in order, within the time window."
      submitLabel={funnel ? "Save" : "Create funnel"}
      onSubmit={async (f) => {
        await save.mutateAsync({
          name: String(f.get("name")).trim(),
          description: String(f.get("description") ?? "").trim() || undefined,
          parameters: {
            window: Number(f.get("window")),
            steps: steps.map((s) => ({ type: s.type, value: s.value.trim() })),
          },
        })
        toast.success(funnel ? "Funnel updated" : "Funnel created")
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <TextField
          label="Name"
          name="name"
          defaultValue={funnel?.name}
          placeholder="Signup flow"
          required
          maxLength={200}
        />
        <TextField
          label="Window (minutes)"
          name="window"
          type="number"
          min={1}
          defaultValue={funnel?.parameters.window ?? 60}
          required
        />
      </div>
      <TextField
        label="Description"
        name="description"
        defaultValue={funnel?.description ?? ""}
        maxLength={500}
      />
      <div className="grid gap-2">
        <span className="text-[13px] font-medium">Steps</span>
        {steps.map((step, i) => (
          <StepRow
            key={step.key}
            websiteId={websiteId}
            index={i}
            step={step}
            canRemove={steps.length > 2}
            onChange={(patch) =>
              setSteps((all) =>
                all.map((s) => (s.key === step.key ? { ...s, ...patch } : s))
              )
            }
            onRemove={() =>
              setSteps((all) => all.filter((s) => s.key !== step.key))
            }
          />
        ))}
        <div>
          <Button
            size="sm"
            disabled={steps.length >= MAX_STEPS}
            onClick={() =>
              setSteps((all) => [
                ...all,
                { key: counter.current++, type: "path", value: "" },
              ])
            }
          >
            <PlusIcon />
            Add step
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}

function FunnelCard({
  websiteId,
  funnel,
}: {
  websiteId: string
  funnel: Funnel
}) {
  const { query } = useWebsiteQuery()
  const [editing, setEditing] = useState(false)
  const { data, isLoading, error } = useApi<FunnelStep[]>(
    `/websites/${websiteId}/funnels/${funnel.id}/stats`,
    query
  )
  const start = data?.[0]?.visitors ?? 0
  const end = data?.[data.length - 1]?.visitors ?? 0

  return (
    <SectionCard
      title={funnel.name}
      description={
        funnel.description ||
        `${funnel.parameters.steps.length} steps · ${funnel.parameters.window} min window`
      }
      actions={
        <>
          {data && start > 0 && (
            <Pill tone="brand" className="tabular">
              {((end / start) * 100).toFixed(1)}% convert
            </Pill>
          )}
          <div className="-mr-2 flex items-center">
            <DefinitionActions
              name={funnel.name}
              deletePath={`/websites/${websiteId}/funnels/${funnel.id}`}
              onEdit={() => setEditing(true)}
            />
          </div>
        </>
      }
    >
      {error ? (
        <ErrorText error={error} className="border-t" />
      ) : isLoading || !data ? (
        <LoadingRows rows={funnel.parameters.steps.length} />
      ) : (
        <FunnelSteps steps={data} />
      )}
      <FunnelDialog
        websiteId={websiteId}
        funnel={funnel}
        open={editing}
        onOpenChange={setEditing}
      />
    </SectionCard>
  )
}

function FunnelsPage() {
  const { websiteId } = Route.useParams()
  const [creating, setCreating] = useState(false)
  const { data, isLoading, error } = useApi<Paged<Funnel>>(
    `/websites/${websiteId}/funnels`,
    { pageSize: 100 }
  )

  const create = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <PlusIcon />
      Create funnel
    </Button>
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Funnels"
        description="See where visitors drop off on the way to a conversion."
        actions={data?.data.length ? create : undefined}
      />
      <WebsiteToolbar />
      {error ? (
        <SectionCard>
          <ErrorText error={error} />
        </SectionCard>
      ) : isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : !data?.data.length ? (
        <SectionCard>
          <EmptyState
            icon={FilterIcon}
            title="No funnels yet"
            description="Create a funnel from pages or events to see conversion and drop-off per step."
            action={create}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.data.map((funnel) => (
            <FunnelCard key={funnel.id} websiteId={websiteId} funnel={funnel} />
          ))}
        </div>
      )}
      <FunnelDialog
        websiteId={websiteId}
        open={creating}
        onOpenChange={setCreating}
      />
    </div>
  )
}
