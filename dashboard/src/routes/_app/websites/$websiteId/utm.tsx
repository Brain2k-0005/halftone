import { createFileRoute } from "@tanstack/react-router"
import { SectionCard } from "@/components/app/section-card"
import { ErrorText, LoadingRows, PageHeader } from "@/components/app/ui-kit"
import { TopList } from "@/components/app/top-list"
import { WebsiteToolbar } from "@/components/app/website-controls"
import type { MetricRow } from "@/lib/api"
import { useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/utm")({
  staticData: { crumb: { label: "UTM", icon: "website" } },
  component: UtmPage,
})

const TYPES = [
  {
    type: "utm_source",
    title: "Source",
    description: "Where the traffic comes from",
  },
  {
    type: "utm_medium",
    title: "Medium",
    description: "Channel such as cpc or email",
  },
  {
    type: "utm_campaign",
    title: "Campaign",
    description: "Named marketing campaigns",
  },
  {
    type: "utm_content",
    title: "Content",
    description: "Ad or link variations",
  },
  { type: "utm_term", title: "Term", description: "Paid search keywords" },
] as const

function UtmCard({
  websiteId,
  type,
  title,
  description,
}: {
  websiteId: string
  type: string
  title: string
  description: string
}) {
  const { query } = useWebsiteQuery()
  const { data, isLoading, error } = useApi<{ utm: string; views: number }[]>(
    `/websites/${websiteId}/utm/metrics`,
    {
      ...query,
      type,
    }
  )
  const rows: MetricRow[] = (data ?? []).map((r) => ({
    x: r.utm,
    y: Number(r.views),
  }))

  return (
    <SectionCard title={title} description={description}>
      {error ? (
        <ErrorText error={error} className="border-t" />
      ) : isLoading ? (
        <LoadingRows rows={4} />
      ) : (
        <TopList
          rows={rows.slice(0, 10)}
          renderMeta={(row, share) =>
            `${formatNumber(row.y)} views · ${Math.round(share)} %`
          }
          empty={`No ${title.toLowerCase()} values in this period`}
        />
      )}
    </SectionCard>
  )
}

function UtmPage() {
  const { websiteId } = Route.useParams()
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="UTM"
        description="Campaign parameters from your tracked links."
      />
      <WebsiteToolbar />
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {TYPES.map((t) => (
          <UtmCard key={t.type} websiteId={websiteId} {...t} />
        ))}
      </div>
    </div>
  )
}
