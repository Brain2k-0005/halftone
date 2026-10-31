import { CheckIcon, UsersIcon } from "lucide-react"
import type { CSSProperties } from "react"
import { Dither } from "@/components/app/dither"
import {
  DeltaPill,
  Progress,
  Segmented,
  Sparkline,
} from "@/components/app/section-card"
import {
  accentOf,
  isHex,
  PRESETS,
  RADII,
  radiusOf,
  SHELLS,
  type ShellId,
  type Appearance,
  type RadiusId,
} from "@/lib/branding"
import { cn } from "@/lib/utils"

/** Preset swatches, custom accent, radius and dither – shared by Settings → Appearance and Admin → Branding. */
export function AppearanceEditor({
  value,
  onChange,
}: {
  value: Appearance
  onChange: (next: Appearance) => void
}) {
  const set = (patch: Partial<Appearance>) => onChange({ ...value, ...patch })

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="text-[13px] font-medium">Theme</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = value.preset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ preset: p.id, accent: p.accent })}
                aria-pressed={active}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg border bg-card pr-3 pl-2 text-[13px] font-medium shadow-xs transition-colors hover:bg-accent",
                  active && "ring-2 ring-ring"
                )}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-md text-white"
                  style={{ background: p.accent }}
                >
                  {active && <CheckIcon className="size-3" strokeWidth={3} />}
                </span>
                {p.label}
              </button>
            )
          })}
          <label
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-card pr-3 pl-2 text-[13px] font-medium shadow-xs transition-colors hover:bg-accent",
              value.preset === "custom" && "ring-2 ring-ring"
            )}
          >
            <input
              type="color"
              value={value.accent}
              onChange={(e) =>
                set({ preset: "custom", accent: e.target.value })
              }
              className="size-5 cursor-pointer rounded-md border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
              aria-label="Custom accent colour"
            />
            Custom
          </label>
          {value.preset === "custom" && (
            <input
              value={value.accent}
              onChange={(e) =>
                isHex(e.target.value) && set({ accent: e.target.value })
              }
              maxLength={7}
              className="h-9 w-24 rounded-lg border bg-background px-2.5 font-mono text-xs uppercase"
              aria-label="Accent hex value"
            />
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-[13px] font-medium">Layout</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SHELLS.map((sh) => {
            const active = value.shell === sh.id
            return (
              <button
                key={sh.id}
                type="button"
                onClick={() => set({ shell: sh.id })}
                aria-pressed={active}
                className={cn(
                  "grid gap-2.5 rounded-xl border bg-card p-2.5 text-left shadow-xs transition-colors hover:bg-accent",
                  active && "ring-2 ring-ring"
                )}
              >
                <ShellThumb shell={sh.id} />
                <span>
                  <span className="block text-[13px] font-medium">
                    {sh.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {sh.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div className="grid gap-2">
          <p className="text-[13px] font-medium">Corners</p>
          <Segmented
            value={value.radius}
            options={RADII.map((r) => ({ value: r.id, label: r.label }))}
            onChange={(radius) => set({ radius: radius as RadiusId })}
          />
        </div>
        <div className="grid gap-2">
          <p className="text-[13px] font-medium">Dither texture</p>
          <Segmented
            value={value.dither ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => set({ dither: v === "on" })}
          />
        </div>
      </div>
    </div>
  )
}

/** Schematic of a shell: nav chrome in the sidebar tone, content in the page tone. */
function ShellThumb({ shell }: { shell: ShellId }) {
  const nav = "bg-[var(--sidebar-bg)]"
  const lines = (
    <div className="grid gap-1 p-1.5">
      <div className="h-1 w-3/5 rounded-full bg-muted-foreground/40" />
      <div className="h-1 w-4/5 rounded-full bg-muted-foreground/25" />
      <div className="h-1 w-2/5 rounded-full bg-muted-foreground/25" />
    </div>
  )
  const content = (cls: string) => (
    <div className={cn("flex-1 border bg-background", cls)}>
      <div className="h-2.5 border-b" />
      <div className="grid grid-cols-2 gap-1 p-1.5">
        <div className="h-4 rounded-sm bg-muted" />
        <div className="h-4 rounded-sm bg-muted" />
      </div>
    </div>
  )
  const frame = "flex h-[76px] overflow-hidden rounded-lg border"
  if (shell === "sidebar")
    return (
      <div className={cn(frame, "bg-background")}>
        <div className={cn("w-1/4 border-r", nav)}>{lines}</div>
        {content("rounded-none border-0")}
      </div>
    )
  if (shell === "inset")
    return (
      <div className={cn(frame, nav)}>
        <div className="w-1/4">{lines}</div>
        {content("m-1 ml-0 rounded-md shadow-xs")}
      </div>
    )
  if (shell === "floating")
    return (
      <div
        className={cn(
          frame,
          "gap-1 bg-[color-mix(in_oklab,var(--background)_92%,var(--foreground))] p-1"
        )}
      >
        <div className={cn("w-1/4 rounded-md border shadow-xs", nav)}>
          {lines}
        </div>
        {content("rounded-md shadow-xs")}
      </div>
    )
  return (
    <div className={cn(frame, "bg-background")}>
      <div
        className={cn(
          "flex w-[10%] flex-col items-center gap-1 border-r py-1.5",
          nav
        )}
      >
        <div className="size-1.5 rounded-sm bg-brand" />
        <div className="size-1.5 rounded-sm bg-muted-foreground/40" />
        <div className="size-1.5 rounded-sm bg-muted-foreground/40" />
      </div>
      <div className={cn("w-1/5 border-r", nav)}>{lines}</div>
      {content("rounded-none border-0")}
    </div>
  )
}

/** A miniature overview card rendered with the given appearance (independent of the page's current theme). */
export function AppearancePreview({ value }: { value: Appearance }) {
  const style = {
    "--brand": accentOf(value),
    "--radius": radiusOf(value),
  } as CSSProperties
  return (
    <div style={style} className="rounded-xl border bg-background p-4">
      <div
        className={cn(
          "relative rounded-xl border bg-card shadow-xs",
          value.dither && "dither"
        )}
      >
        {value.dither && <Dither />}
        <div className="flex items-start justify-between px-4 pt-3.5 pb-2">
          <div>
            <p className="text-sm font-semibold">Overview</p>
            <p className="text-xs text-muted-foreground">
              The key numbers for the period
            </p>
          </div>
          <Segmented
            value="m"
            options={[
              { value: "w", label: "Week" },
              { value: "m", label: "Month" },
            ]}
            onChange={() => {}}
          />
        </div>
        <div className="grid grid-cols-2">
          <div className="px-4 py-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <UsersIcon className="size-4" strokeWidth={1.75} /> Visitors
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="tabular text-xl font-semibold">15.4K</p>
              <Sparkline
                className="w-16"
                values={[3, 5, 4, 7, 6, 9, 8, 11]}
                tone="brand"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <DeltaPill value={12.4} />
              <span className="text-muted-foreground">
                Above previous period
              </span>
            </div>
          </div>
          <div className="border-l px-4 py-3">
            <p className="text-[13px] font-medium text-muted-foreground">
              Top page
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold text-brand-deep">
                /
              </span>
              <p className="text-[13px] font-semibold">/pricing</p>
            </div>
            <Progress className="mt-3" percent={72} />
          </div>
        </div>
      </div>
    </div>
  )
}
