import { createFileRoute } from "@tanstack/react-router"
import { EyeIcon, GitForkIcon, UsersIcon, WaypointsIcon } from "lucide-react"
import { useState } from "react"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { TopList } from "@/components/app/top-list"
import {
  EmptyState,
  ErrorText,
  LoadingRows,
  PageHeader,
  Skeleton,
} from "@/components/app/ui-kit"
import { WebsiteToolbar } from "@/components/app/website-controls"
import { ValueInput } from "@/components/reports/common"
import type { MetricRow } from "@/lib/api"
import { useApi } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"
import { useWebsiteQuery } from "@/lib/website-query"

export const Route = createFileRoute("/_app/websites/$websiteId/attribution")({
  staticData: { crumb: { label: "Attribution", icon: "website" } },
  component: AttributionPage,
})

type Entry = { name: string; value: number }
interface Attribution {
  referrer: Entry[]
  paidAds: Entry[]
  utm_source: Entry[]
  utm_medium: Entry[]
  utm_campaign: Entry[]
  utm_content: Entry[]
  utm_term: Entry[]
  total: { pageviews: number; visitors: number; visits: number }
}

const GROUPS: {
  key: keyof Omit<Attribution, "total">
  title: string
  description: string
}[] = [
  {
    key: "referrer",
    title: "Referrers",
    description: "Websites that sent visitors before the conversion",
  },
  {
    key: "paidAds",
    title: "Paid ads",
    description: "Ad platforms detected from click IDs",
  },
  {
    key: "utm_source",
    title: "UTM source",
    description: "Where the traffic comes from",
  },
  {
    key: "utm_medium",
    title: "UTM medium",
    description: "Channel such as cpc or email",
  },
  {
    key: "utm_campaign",
    title: "UTM campaign",
    description: "Named marketing campaigns",
  },
  {
    key: "utm_content",
    title: "UTM content",
    description: "Ad or link variations",
  },
  { key: "utm_term", title: "UTM term", description: "Paid search keywords" },
]

const toRows = (entries: Entry[]): MetricRow[] =>
  entries.map((e) => ({ x: e.name, y: Number(e.value) }))

function AttributionPage() {
  const { websiteId } = Route.useParams()
  const { query } = useWebsiteQuery()
  const [model, setModel] = useState<"first-click" | "last-click">(
    "first-click"
  )
  const [type, setType] = useState<"path" | "event">("path")
  const [step, setStep] = useState("")
  const conversion = step.trim()

  const { data, isLoading, error } = useApi<Attribution>(
    `/websites/${websiteId}/attribution`,
    { ...query, model, type, step: conversion },
    { enabled: !!conversion }
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Attribution"
        description="Find out which sources lead visitors to a conversion."
      />
      <WebsiteToolbar />

      <SectionCard
        title="Conversion"
        description="Choose what counts as a conversion and how credit is assigned."
      >
        <div className="grid gap-4 border-t px-5 py-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium">Model</span>
            <Segmented
              value={model}
              onChange={setModel}
              options={[
                { value: "first-click", label: "First click" },
                { value: "last-click", label: "Last click" },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium">Conversion type</span>
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: "path", label: "Page" },
                { value: "event", label: "Event" },
              ]}
            />
          </div>
          <ValueInput
            websiteId={websiteId}
            type={type}
            label="Conversion step"
            value={step}
            onValueChange={setStep}
          />
        </div>
      </SectionCard>

      {!conversion ? (
        <SectionCard>
          <EmptyState
            icon={WaypointsIcon}
            title="Pick a conversion"
            description="Enter a page path or event name above to see which sources drove it."
          />
        </SectionCard>
      ) : error ? (
        <SectionCard>
          <ErrorText error={error} />
        </SectionCard>
      ) : isLoading || !data ? (
        <>
          <SectionCard>
            <div className="p-5">
              <Skeleton className="h-20 w-full" />
            </div>
          </SectionCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard>
              <LoadingRows rows={4} />
            </SectionCard>
            <SectionCard>
              <LoadingRows rows={4} />
            </SectionCard>
          </div>
        </>
      ) : (
        <>
          <SectionCard>
            <div className="grid sm:grid-cols-3 sm:divide-x">
              {[
                {
                  icon: UsersIcon,
                  label: "Visitors",
                  value: data.total.visitors,
                },
                {
                  icon: GitForkIcon,
                  label: "Visits",
                  value: data.total.visits,
                },
                {
                  icon: EyeIcon,
                  label: "Page views",
                  value: data.total.pageviews,
                },
              ].map((t) => (
                <div key={t.label} className="px-5 py-4">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                    <t.icon className="size-4" strokeWidth={1.75} />
                    {t.label}
                  </p>
                  <p className="tabular mt-3 text-2xl leading-none font-semibold tracking-tight">
                    {formatNumber(t.value)}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {GROUPS.map((g) => (
              <SectionCard
                key={g.key}
                title={g.title}
                description={g.description}
              >
                <TopList
                  rows={toRows(data[g.key] ?? []).slice(0, 10)}
                  renderMeta={(row, share) =>
                    `${formatNumber(row.y)} conversions · ${Math.round(share)} %`
                  }
                  empty="No attributed conversions"
                />
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
