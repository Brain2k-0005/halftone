import { useUmamiPublicUrl } from "@/components/app/brand"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  CopyField,
  SelectField,
  TextField,
} from "@/components/app/ui-kit"
import {
  type ReplayConfig,
  type WebsiteInfo,
} from "@/components/behavior/website-info"
import { Switch } from "@/components/ui/switch"
import { useApiMutation } from "@/lib/api-client"

const DURATIONS = [
  { value: "300000", label: "5 minutes" },
  { value: "600000", label: "10 minutes" },
  { value: "900000", label: "15 minutes" },
  { value: "1200000", label: "20 minutes" },
]

const MASK_LEVELS = [
  { value: "moderate", label: "Moderate – mask inputs" },
  { value: "strict", label: "Strict – mask all text" },
]

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}

function Rate({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-[13px] font-medium">
        {label}
        <span className="tabular text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </span>
      <input
        type="range"
        min={0.05}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--brand)]"
      />
    </label>
  )
}

export function RecordingCard({ website }: { website: WebsiteInfo }) {
  const umamiUrl = useUmamiPublicUrl()
  const config: ReplayConfig = website.replayConfig ?? {}
  const [replayEnabled, setReplayEnabled] = useState(
    config.replayEnabled === true
  )
  const [heatmapEnabled, setHeatmapEnabled] = useState(
    config.heatmapEnabled === true
  )
  const [sampleRate, setSampleRate] = useState(config.sampleRate ?? 0.15)
  const [heatmapSampleRate, setHeatmapSampleRate] = useState(
    config.heatmapSampleRate ?? 0.15
  )
  const [maskLevel, setMaskLevel] = useState<string>(
    config.maskLevel ?? "moderate"
  )
  const [maxDuration, setMaxDuration] = useState(
    String(config.maxDuration ?? 300000)
  )
  const [blockSelector, setBlockSelector] = useState(config.blockSelector ?? "")
  const save = useApiMutation<{ replayConfig: ReplayConfig }>(
    "POST",
    `/websites/${website.id}`,
    ["/websites"]
  )

  useEffect(() => {
    const c = website.replayConfig ?? {}
    setReplayEnabled(c.replayEnabled === true)
    setHeatmapEnabled(c.heatmapEnabled === true)
    setSampleRate(c.sampleRate ?? 0.15)
    setHeatmapSampleRate(c.heatmapSampleRate ?? 0.15)
    setMaskLevel(c.maskLevel ?? "moderate")
    setMaxDuration(String(c.maxDuration ?? 300000))
    setBlockSelector(c.blockSelector ?? "")
  }, [website.replayConfig])

  const next = (over: Partial<ReplayConfig> = {}): ReplayConfig => ({
    ...config,
    replayEnabled,
    heatmapEnabled,
    sampleRate,
    heatmapSampleRate,
    maskLevel: maskLevel as ReplayConfig["maskLevel"],
    maxDuration: parseInt(maxDuration, 10) || 300000,
    blockSelector,
    ...over,
  })

  const persist = (replayConfig: ReplayConfig, rollback?: () => void) =>
    save.mutate(
      { replayConfig },
      {
        onSuccess: () => toast.success("Recording settings saved"),
        onError: (err) => {
          rollback?.()
          toast.error(err.message)
        },
      }
    )

  const toggleReplay = (v: boolean) => {
    setReplayEnabled(v)
    persist(next({ replayEnabled: v }), () => setReplayEnabled(!v))
  }
  const toggleHeatmap = (v: boolean) => {
    setHeatmapEnabled(v)
    persist(next({ heatmapEnabled: v }), () => setHeatmapEnabled(!v))
  }

  const code = `<script defer src="${umamiUrl}/recorder.js" data-website-id="${website.id}"></script>`
  const active = replayEnabled || heatmapEnabled

  return (
    <SectionCard
      title="Replays & heatmaps"
      description="Record sessions and collect click and scroll data. Needs the recorder script on your site."
    >
      <div className="grid gap-5 border-t px-5 py-5">
        <Toggle
          label="Session replays"
          description="Record visitor sessions so you can watch them back."
          checked={replayEnabled}
          onChange={toggleReplay}
          disabled={save.isPending}
        />
        <Toggle
          label="Heatmaps"
          description="Collect click and scroll positions for every page."
          checked={heatmapEnabled}
          onChange={toggleHeatmap}
          disabled={save.isPending}
        />

        {active && (
          <>
            <CopyField label="Recorder code" value={code} multiline />
            <div className="grid gap-5 sm:grid-cols-2">
              {heatmapEnabled && (
                <Rate
                  label="Heatmap sample rate"
                  value={heatmapSampleRate}
                  onChange={setHeatmapSampleRate}
                />
              )}
              {replayEnabled && (
                <>
                  <Rate
                    label="Replay sample rate"
                    value={sampleRate}
                    onChange={setSampleRate}
                  />
                  <SelectField
                    label="Mask level"
                    value={maskLevel}
                    onChange={(e) => setMaskLevel(e.target.value)}
                    options={MASK_LEVELS}
                  />
                  <SelectField
                    label="Max duration"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    options={DURATIONS}
                  />
                  <TextField
                    label="Block selector"
                    hint="CSS selector of elements that are never recorded."
                    value={blockSelector}
                    onChange={(e) => setBlockSelector(e.target.value)}
                    placeholder=".private, [data-secret]"
                  />
                </>
              )}
            </div>
            <div>
              <Button
                variant="primary"
                loading={save.isPending}
                onClick={() => persist(next())}
              >
                Save recording settings
              </Button>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  )
}
