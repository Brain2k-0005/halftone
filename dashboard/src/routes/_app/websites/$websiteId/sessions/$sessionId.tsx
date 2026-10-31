import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router"
import {
  ActivityIcon,
  ArrowLeftIcon,
  ClockIcon,
  EyeIcon,
  MousePointerClickIcon,
  UsersIcon,
} from "lucide-react"
import { useState } from "react"
import { SectionCard } from "@/components/app/section-card"
import { countryName, flag } from "@/components/app/top-list"
import { EmptyState, PageHeader, Skeleton } from "@/components/app/ui-kit"
import { Cap, StatTiles, useWebsiteId, when } from "@/components/traffic/shared"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useApi } from "@/lib/api-client"
import { formatDuration, formatNumber, safeSiteUrl } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute(
  "/_app/websites/$websiteId/sessions/$sessionId"
)({
  staticData: { crumb: { label: "Session", icon: "website" } },
  component: SessionPage,
})

interface Session {
  id: string
  browser: string
  os: string
  device: string
  screen: string | null
  language: string | null
  country: string | null
  region: string | null
  city: string | null
  firstAt: string
  lastAt: string
  visits: number
  views: number | string
  events: number | string
  totaltime: number | string
  distinctIds?: string[]
  distinctId?: string
  stitchedSessionCount?: number
}

interface Activity {
  createdAt: string
  urlPath: string
  eventId: string
  eventType: number
  eventName: string | null
  visitId: string
  hostname: string
  hasData: boolean
}

interface DataRow {
  dataKey: string
  stringValue: string | null
  numberValue: string | null
  dateValue: string | null
}

const dataValue = (r: DataRow) =>
  r.stringValue ?? r.numberValue ?? r.dateValue ?? ""

function SessionPage() {
  const websiteId = useWebsiteId()
  const { sessionId } = Route.useParams()
  const { query } = useWebsiteQuery()
  const session = useApi<Session>(
    `/websites/${websiteId}/sessions/${sessionId}`
  )
  const activity = useApi<Activity[]>(
    `/websites/${websiteId}/sessions/${sessionId}/activity`,
    {
      startAt: query.startAt,
      endAt: query.endAt,
      timezone: query.timezone,
    }
  )
  const props = useApi<DataRow[]>(
    `/websites/${websiteId}/sessions/${sessionId}/properties`
  )
  const s = session.data

  const info: [string, React.ReactNode][] = s
    ? [
        [
          "Distinct ID",
          s.distinctIds && s.distinctIds.length > 1
            ? `${s.distinctIds.length} linked IDs`
            : s.distinctId?.trim() || s.distinctIds?.[0] || "—",
        ],
        ["First seen", when(s.firstAt)],
        ["Last seen", when(s.lastAt)],
        [
          "Country",
          s.country ? `${flag(s.country)} ${countryName(s.country)}` : "—",
        ],
        ["Region", s.region || "—"],
        ["City", s.city || "—"],
        ["Browser", <Cap key="b">{s.browser}</Cap>],
        ["OS", s.os],
        ["Device", <Cap key="d">{s.device}</Cap>],
        ["Screen", s.screen || "—"],
        ["Language", s.language || "—"],
      ]
    : []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Link
              to="/websites/$websiteId/sessions"
              params={{ websiteId }}
              search={(prev: Record<string, unknown>) => prev as never}
              aria-label="Back to sessions"
              className="inline-flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs hover:bg-accent hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
            </Link>
            Session {sessionId.slice(0, 8)}
          </span>
        }
        description="Everything this visitor did on the website"
      />

      <SectionCard dither title="Session" description="Who this visitor is">
        {session.error ? (
          <p className="px-5 py-10 text-center text-sm text-destructive">
            {session.error.message}
          </p>
        ) : !s ? (
          <Skeleton className="m-5 h-40" />
        ) : (
          <>
            <StatTiles
              tiles={[
                {
                  icon: UsersIcon,
                  label: "Visits",
                  value: formatNumber(Number(s.visits)),
                },
                {
                  icon: EyeIcon,
                  label: "Views",
                  value: formatNumber(Number(s.views)),
                },
                {
                  icon: MousePointerClickIcon,
                  label: "Events",
                  value: formatNumber(Number(s.events)),
                },
                {
                  icon: ClockIcon,
                  label: "Time spent",
                  value: formatDuration(Number(s.totaltime)),
                },
              ]}
            />
            <dl className="grid gap-x-6 gap-y-4 border-t px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {info.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 truncate text-[13px] font-medium">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard
          title="Activity"
          description="Page views and events in order"
        >
          {activity.error ? (
            <p className="border-t px-5 py-10 text-center text-sm text-destructive">
              {activity.error.message}
            </p>
          ) : !activity.data ? (
            <Skeleton className="m-5 h-40" />
          ) : activity.data.length === 0 ? (
            <div className="border-t">
              <EmptyState
                icon={ActivityIcon}
                title="No activity"
                description="Nothing recorded in this period."
              />
            </div>
          ) : (
            <Timeline websiteId={websiteId} items={activity.data} />
          )}
        </SectionCard>

        <SectionCard
          title="Properties"
          description="Data attached to this session"
          className="self-start"
        >
          {!props.data ? (
            <Skeleton className="m-5 h-20" />
          ) : props.data.length === 0 ? (
            <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
              No properties
            </p>
          ) : (
            <dl className="divide-y border-t text-[13px]">
              {props.data.map((r) => (
                <div
                  key={r.dataKey}
                  className="flex items-center justify-between gap-4 px-5 py-2.5"
                >
                  <dt className="text-muted-foreground">{r.dataKey}</dt>
                  <dd className="truncate font-medium">{dataValue(r)}</dd>
                </div>
              ))}
            </dl>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function Timeline({
  websiteId,
  items,
}: {
  websiteId: string
  items: Activity[]
}) {
  const [open, setOpen] = useState<Activity | null>(null)
  let lastDay = ""
  return (
    <>
      <ul className="border-t">
        {items.map((a) => {
          const day = new Date(a.createdAt).toDateString()
          const header = day !== lastDay
          lastDay = day
          return (
            <li key={a.eventId}>
              {header && (
                <p className="border-b bg-[color-mix(in_oklab,var(--card)_96%,var(--foreground))] px-5 py-2 text-xs font-medium text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("en", {
                    dateStyle: "full",
                  })}
                </p>
              )}
              <div className="flex items-center gap-3 border-b px-5 py-3 text-[13px] last:border-b-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep [&_svg]:size-3.5">
                  {a.eventName ? <ActivityIcon /> : <EyeIcon />}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {a.eventName ? (
                    <>
                      Triggered event{" "}
                      <span className="font-semibold">{a.eventName}</span>
                    </>
                  ) : (
                    <>
                      Viewed page{" "}
                      <PageLink hostname={a.hostname} path={a.urlPath} />
                    </>
                  )}
                </span>
                {a.hasData && (
                  <button
                    type="button"
                    onClick={() => setOpen(a)}
                    className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Properties
                  </button>
                )}
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleTimeString("en", {
                    timeStyle: "medium",
                  })}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <EventProps
        websiteId={websiteId}
        item={open}
        onClose={() => setOpen(null)}
      />
    </>
  )
}

function EventProps({
  websiteId,
  item,
  onClose,
}: {
  websiteId: string
  item: Activity | null
  onClose: () => void
}) {
  const { data } = useApi<DataRow[]>(
    item ? `/websites/${websiteId}/event-data/${item.eventId}` : null
  )
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.eventName ?? "Event"} properties</DialogTitle>
        </DialogHeader>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <dl className="divide-y rounded-lg border text-[13px]">
            {data.map((r) => (
              <div
                key={r.dataKey}
                className="flex items-center justify-between gap-4 px-3 py-2"
              >
                <dt className="text-muted-foreground">{r.dataKey}</dt>
                <dd className="truncate font-medium">{dataValue(r)}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}

const websiteRoute = getRouteApi("/_app/websites/$websiteId")

/** Links only to pages on the website's own domain; tracker data is untrusted, anything else stays plain text. */
function PageLink({
  hostname,
  path,
}: {
  hostname?: string | null
  path?: string | null
}) {
  const { website } = websiteRoute.useLoaderData()
  const href = safeSiteUrl(website.domain, hostname, path)
  if (!href) return <span className="font-semibold">{path}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-semibold hover:underline"
    >
      {path}
    </a>
  )
}
