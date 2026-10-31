import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import {
  AppearanceEditor,
  AppearancePreview,
} from "@/components/app/appearance-editor"
import { useAppearance, useBranding } from "@/components/app/brand"
import { SectionCard } from "@/components/app/section-card"
import { setTheme, useTheme } from "@/components/app/theme"
import { Button } from "@/components/app/ui-kit"
import { Segmented } from "@/components/app/section-card"

export const Route = createFileRoute("/_app/settings/appearance")({
  staticData: { crumb: { label: "Appearance", icon: "overview" } },
  component: AppearancePage,
})

function AppearancePage() {
  const branding = useBranding()
  const { appearance, custom, setAppearance, reset } = useAppearance()
  const { theme } = useTheme()

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Appearance"
        description={`Pick a theme for this browser. Without a choice you get the ${branding.name} default set by your administrator.`}
        actions={
          custom && (
            <Button
              size="sm"
              onClick={() => {
                reset()
                toast.success("Back to the default theme")
              }}
            >
              Use default
            </Button>
          )
        }
      >
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="grid content-start gap-6">
            <div className="grid gap-2">
              <p className="text-[13px] font-medium">Mode</p>
              <Segmented
                value={theme}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
                onChange={(t) => setTheme(t as "light" | "dark")}
              />
            </div>
            <AppearanceEditor value={appearance} onChange={setAppearance} />
          </div>
          <AppearancePreview value={appearance} />
        </div>
      </SectionCard>
    </div>
  )
}
