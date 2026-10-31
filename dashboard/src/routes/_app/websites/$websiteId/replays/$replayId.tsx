import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  BookmarkIcon,
  BookmarkCheckIcon,
  VideoOffIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Pill, SectionCard } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import {
  Button,
  EmptyState,
  ErrorText,
  FormDialog,
  PageHeader,
  Skeleton,
  TextField,
} from "@/components/app/ui-kit"
import { ReplayPlayer } from "@/components/behavior/replay-player"
import { useApi, useApiMutation } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"

export const Route = createFileRoute(
  "/_app/websites/$websiteId/replays/$replayId"
)({
  staticData: { crumb: { label: "Replay", icon: "website" } },
  component: ReplayPage,
})

interface ReplayData {
  sessionId: string | null
  events: any[]
  startedAt: string | null
  endedAt: string | null
  eventCount: number
  chunkCount: number
}

interface Session {
  id: string
  browser?: string
  os?: string
  device?: string
  country?: string
  city?: string
  visits?: number
  views?: number
}

function ReplayPage() {
  const { websiteId, replayId } = Route.useParams()
  const base = `/websites/${websiteId}/replays`
  const replay = useApi<ReplayData>(`${base}/${replayId}`, undefined, {
    staleTime: 5 * 60_000,
  })
  const session = useApi<Session>(
    replay.data?.sessionId
      ? `/websites/${websiteId}/sessions/${replay.data.sessionId}`
      : null
  )
  const saved = useApi<{ isSaved: boolean }>(`${base}/saved/${replayId}`)
  const toggle = useApiMutation<{ isSaved: boolean; name?: string }>(
    "POST",
    `${base}/saved/${replayId}`,
    [base]
  )
  const [saving, setSaving] = useState(false)

  const events = useMemo(() => replay.data?.events ?? [], [replay.data])
  const isSaved = saved.data?.isSaved ?? false
  const s = session.data

  const unsave = () =>
    toggle.mutate(
      { isSaved: false },
      { onSuccess: () => toast.success("Removed from saved replays") }
    )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Replay"
        description={
          replay.data
            ? `${formatNumber(replay.data.eventCount)} recorded actions${
                replay.data.startedAt
                  ? ` · ${new Date(replay.data.startedAt).toLocaleString()}`
                  : ""
              }`
            : undefined
        }
        actions={
          <>
            <Link
              to="/websites/$websiteId/replays"
              params={{ websiteId }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs hover:bg-accent"
            >
              <ArrowLeftIcon className="size-4" /> All replays
            </Link>
            {replay.data && (
              <Button
                loading={toggle.isPending}
                onClick={() => (isSaved ? unsave() : setSaving(true))}
                variant={isSaved ? "primary" : "outline"}
              >
                {isSaved ? <BookmarkCheckIcon /> : <BookmarkIcon />}
                {isSaved ? "Saved" : "Save replay"}
              </Button>
            )}
          </>
        }
      />

      <SectionCard
        dither
        title="Playback"
        actions={
          s && (
            <div className="flex flex-wrap items-center gap-1.5">
              {s.country && (
                <Pill>
                  {flag(s.country)} {s.city ? `${s.city}, ` : ""}
                  {countryName(s.country)}
                </Pill>
              )}
              {s.browser && <Pill className="capitalize">{s.browser}</Pill>}
              {s.os && <Pill>{s.os}</Pill>}
              {s.device && <Pill className="capitalize">{s.device}</Pill>}
            </div>
          )
        }
        bodyClassName="p-5"
      >
        {replay.isLoading ? (
          <Skeleton className="mx-auto h-[420px] w-full max-w-5xl" />
        ) : replay.error ? (
          <ErrorText error={replay.error} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={VideoOffIcon}
            title="No recording found"
            description="This replay has no events. It may have been removed or expired."
          />
        ) : (
          <ReplayPlayer events={events} />
        )}
      </SectionCard>

      <FormDialog
        open={saving}
        onOpenChange={setSaving}
        title="Save replay"
        description="Give this replay a name so you can find it in the Saved tab."
        submitLabel="Save"
        onSubmit={async (data) => {
          await toggle.mutateAsync({
            isSaved: true,
            name: String(data.get("name") ?? "").trim() || undefined,
          })
          toast.success("Replay saved")
        }}
      >
        <TextField
          label="Name"
          name="name"
          maxLength={100}
          placeholder="e.g. Checkout confusion"
          autoFocus
        />
      </FormDialog>
    </div>
  )
}
