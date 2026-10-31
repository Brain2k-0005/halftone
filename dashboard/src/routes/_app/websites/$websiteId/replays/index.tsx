import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { BookmarkIcon, PlayIcon, VideoIcon } from "lucide-react"
import { useState } from "react"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import {
  DataTable,
  EmptyState,
  PageHeader,
  Pagination,
  type Column,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { useWebsiteInfo } from "@/components/behavior/website-info"
import { useApi, type Paged } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/replays/")({
  staticData: { crumb: { label: "Replays", icon: "website" } },
  component: ReplaysPage,
})

interface Replay {
  id: string
  sessionId: string
  duration: number
  eventCount: number
  country: string | null
  city: string | null
  browser: string | null
  os: string | null
  device: string | null
  createdAt: string
}

interface SavedReplay {
  id: string
  visitId: string
  name: string
  createdAt: string
}

const PAGE_SIZE = 20

function clock(ms: number) {
  const s = Math.floor((ms || 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })

const PlayTile = () => (
  <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
    <PlayIcon className="size-3.5" />
  </span>
)

function ReplaysPage() {
  const { websiteId } = Route.useParams()
  const navigate = useNavigate()
  const { query } = useWebsiteQuery()
  const [tab, setTab] = useState<"replays" | "saved">("replays")
  const [page, setPage] = useState(1)
  const { data: website, isLoading: websiteLoading } = useWebsiteInfo(websiteId)

  const recording =
    !!website?.recorderEnabled && website.replayConfig?.replayEnabled !== false
  const replays = useApi<Paged<Replay>>(
    tab === "replays" ? `/websites/${websiteId}/replays` : null,
    { ...query, page, pageSize: PAGE_SIZE },
    { placeholderData: (prev) => prev }
  )
  const saved = useApi<Paged<SavedReplay>>(
    tab === "saved" ? `/websites/${websiteId}/replays/saved` : null,
    { page, pageSize: PAGE_SIZE },
    { placeholderData: (prev) => prev }
  )

  const open = (replayId: string) =>
    navigate({
      to: "/websites/$websiteId/replays/$replayId",
      params: { websiteId, replayId },
    })

  const replayColumns: Column<Replay>[] = [
    { key: "play", header: "", className: "w-12", cell: () => <PlayTile /> },
    {
      key: "session",
      header: "Session",
      cell: (r) => (
        <span className="font-mono text-xs">{r.sessionId.slice(0, 8)}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      cell: (r) => clock(r.duration),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => formatNumber(r.eventCount ?? 0),
    },
    {
      key: "location",
      header: "Location",
      cell: (r) =>
        r.country ? (
          <span className="flex items-center gap-2">
            <span>{flag(r.country)}</span>
            <span className="truncate">
              {r.city ? `${r.city}, ` : ""}
              {countryName(r.country)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        ),
    },
    {
      key: "browser",
      header: "Browser",
      cell: (r) => <span className="capitalize">{r.browser ?? "–"}</span>,
    },
    { key: "os", header: "OS", cell: (r) => r.os ?? "–" },
    {
      key: "device",
      header: "Device",
      cell: (r) => <span className="capitalize">{r.device ?? "–"}</span>,
    },
    {
      key: "recorded",
      header: "Recorded",
      cell: (r) => (
        <span className="text-muted-foreground">{when(r.createdAt)}</span>
      ),
    },
  ]

  const savedColumns: Column<SavedReplay>[] = [
    { key: "play", header: "", className: "w-12", cell: () => <PlayTile /> },
    {
      key: "name",
      header: "Name",
      cell: (r) => (
        <span className="font-medium">{r.name || "Untitled replay"}</span>
      ),
    },
    {
      key: "id",
      header: "Replay ID",
      cell: (r) => <span className="font-mono text-xs">{r.visitId}</span>,
    },
    {
      key: "created",
      header: "Saved",
      cell: (r) => (
        <span className="text-muted-foreground">{when(r.createdAt)}</span>
      ),
    },
  ]

  const current = tab === "replays" ? replays : saved
  const notRecording = !websiteLoading && !recording

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Replays"
        description="Watch recorded visitor sessions to see how people use your site."
      />
      <WebsiteToolbar />
      <SectionCard
        dither
        title={tab === "replays" ? "Session replays" : "Saved replays"}
        description={
          current.data ? `${formatNumber(current.data.count)} total` : undefined
        }
        actions={
          <Segmented
            value={tab}
            options={[
              { value: "replays", label: "Replays" },
              { value: "saved", label: "Saved" },
            ]}
            onChange={(v) => {
              setTab(v)
              setPage(1)
            }}
          />
        }
      >
        {tab === "replays" ? (
          <DataTable
            columns={replayColumns}
            rows={replays.data?.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => open(r.id)}
            isLoading={replays.isLoading || websiteLoading}
            error={replays.error}
            empty={
              notRecording ? (
                <EmptyState
                  icon={VideoIcon}
                  title="Session recording is turned off"
                  description="Enable replays in the website settings and add the recorder script to your site to start capturing sessions."
                  action={
                    <Link
                      to="/websites/$websiteId/settings"
                      params={{ websiteId }}
                      search={{ tab: "recording" } as never}
                      className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                    >
                      Open recording settings
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={VideoIcon}
                  title="No replays in this period"
                  description="Recorded sessions that match the date range and filters appear here."
                />
              )
            }
          />
        ) : (
          <DataTable
            columns={savedColumns}
            rows={saved.data?.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => open(r.visitId)}
            isLoading={saved.isLoading}
            error={saved.error}
            empty={
              <EmptyState
                icon={BookmarkIcon}
                title="No saved replays"
                description="Bookmark a replay while watching it to keep it here."
              />
            }
          />
        )}
        {current.data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            count={current.data.count}
            onPage={setPage}
          />
        )}
      </SectionCard>
    </div>
  )
}
