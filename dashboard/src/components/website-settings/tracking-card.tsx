import { SectionCard } from "@/components/app/section-card"
import { CopyField } from "@/components/app/ui-kit"
import { UMAMI_URL } from "@/components/behavior/website-info"

export function TrackingCard({ websiteId }: { websiteId: string }) {
  const code = `<script defer src="${UMAMI_URL}/script.js" data-website-id="${websiteId}"></script>`
  return (
    <SectionCard
      title="Tracking code"
      description="Paste this snippet into the <head> of every page you want to track."
    >
      <div className="grid gap-3 border-t px-5 py-5">
        <CopyField value={code} multiline />
        <p className="text-xs text-muted-foreground">
          The tracker is served by your Umami server at{" "}
          <span className="font-mono">{UMAMI_URL}</span>. Set{" "}
          <span className="font-mono">VITE_UMAMI_URL</span> to change the host
          shown here.
        </p>
      </div>
    </SectionCard>
  )
}
