import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { SectionCard, Segmented } from "@/components/app/section-card"
import { setTheme, useTheme } from "@/components/app/theme"
import { Button, SelectField } from "@/components/app/ui-kit"
import { LANGUAGES } from "@/components/settings/languages"
import {
  DATE_RANGE_KEY,
  DEFAULT_LOCALE,
  LOCALE_KEY,
  localTimezone,
  TIMEZONE_KEY,
  usePref,
} from "@/components/settings/prefs"
import { saveDefaultRange } from "@/lib/default-range"
import { DEFAULT_RANGE, isRange, RANGES, type RangeKey } from "@/lib/range"

export const Route = createFileRoute("/_app/settings/preferences")({
  staticData: { crumb: { label: "Preferences", icon: "overview" } },
  head: () => ({ meta: [{ title: "Preferences · Halftone" }] }),
  component: PreferencesPage,
})

const TIMEZONES = Intl.supportedValuesOf("timeZone").map((value) => ({
  value,
  label: value,
}))
const RANGE_OPTIONS = (Object.keys(RANGES) as RangeKey[]).map((value) => ({
  value,
  label: RANGES[value].long
    .replace(/^the /, "")
    .replace(/^./, (c) => c.toUpperCase()),
}))

function PreferenceRow({
  label,
  value,
  options,
  fallback,
  onSave,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  fallback: string
  onSave: (value: string) => void
}) {
  const save = (next: string) => {
    onSave(next)
    toast.success("Preference saved")
  }
  return (
    <div className="flex items-end gap-2">
      <SelectField
        className="flex-1"
        label={label}
        value={value}
        options={options}
        onChange={(e) => save(e.target.value)}
      />
      <Button onClick={() => save(fallback)}>Reset</Button>
    </div>
  )
}

function PreferencesPage() {
  const { theme } = useTheme()
  const [range, setRange] = usePref(DATE_RANGE_KEY, DEFAULT_RANGE)
  const [timezone, setTimezone] = usePref(TIMEZONE_KEY, localTimezone())
  const [locale, setLocale] = usePref(LOCALE_KEY, DEFAULT_LOCALE)

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Appearance"
        description="Choose how the dashboard looks on this device."
      >
        <div className="px-5 pb-5">
          <Segmented<"light" | "dark">
            value={theme === "light" ? "light" : "dark"}
            onChange={setTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Defaults"
        description="Stored in this browser, in this browser."
      >
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <PreferenceRow
            label="Default date range"
            value={range}
            options={RANGE_OPTIONS}
            fallback={DEFAULT_RANGE}
            onSave={(v) => {
              setRange(v)
              saveDefaultRange(isRange(v) ? v : null)
            }}
          />
          <PreferenceRow
            label="Timezone"
            value={timezone}
            options={TIMEZONES}
            fallback={localTimezone()}
            onSave={setTimezone}
          />
          <PreferenceRow
            label="Language"
            value={locale}
            options={LANGUAGES}
            fallback={DEFAULT_LOCALE}
            onSave={setLocale}
          />
        </div>
      </SectionCard>
    </div>
  )
}
