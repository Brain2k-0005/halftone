import { createFileRoute, useRouter } from "@tanstack/react-router"
import { ImageIcon, TrashIcon, UploadIcon } from "lucide-react"
import { useState, type ChangeEvent } from "react"
import { toast } from "sonner"
import {
  AppearanceEditor,
  AppearancePreview,
} from "@/components/app/appearance-editor"
import { AppLogo, useBranding } from "@/components/app/brand"
import { SectionCard } from "@/components/app/section-card"
import { Button, TextField } from "@/components/app/ui-kit"
import { MAX_LOGO_BYTES, type Branding } from "@/lib/branding"
import { saveBrandingFn } from "@/lib/branding-fns"

export const Route = createFileRoute("/_app/admin/branding")({
  staticData: { crumb: { label: "Branding", icon: "overview" } },
  component: BrandingPage,
})

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

function BrandingPage() {
  const current = useBranding()
  const router = useRouter()
  const [draft, setDraft] = useState<Branding>(current)
  const [saving, setSaving] = useState(false)

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!LOGO_TYPES.includes(file.type))
      return void toast.error("Use a PNG, JPEG, WebP or SVG image.")
    if (file.size > MAX_LOGO_BYTES)
      return void toast.error("The logo must be smaller than 300 KB.")
    const reader = new FileReader()
    reader.onload = () =>
      setDraft((d) => ({ ...d, logo: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveBrandingFn({ data: draft })
      await router.invalidate()
      toast.success("Branding saved for everyone")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the branding"
      )
    } finally {
      setSaving(false)
    }
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(current)

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Identity"
        description="Name and logo shown in the sidebar, on the sign-in page, in the browser tab and on share pages."
      >
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            label="App name"
            value={draft.name}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium">Logo</span>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                <AppLogo branding={draft} className="size-5" />
              </span>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs hover:bg-accent">
                <UploadIcon className="size-4" /> Upload
                <input
                  type="file"
                  accept={LOGO_TYPES.join(",")}
                  onChange={onLogo}
                  className="sr-only"
                />
              </label>
              {draft.logo && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove logo"
                  onClick={() => setDraft({ ...draft, logo: "" })}
                >
                  <TrashIcon />
                </Button>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="size-3" /> Square, PNG/SVG, max 300 KB
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Default theme"
        description="What everyone sees unless they pick their own theme under Settings → Appearance."
      >
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <AppearanceEditor
            value={draft.appearance}
            onChange={(appearance) => setDraft({ ...draft, appearance })}
          />
          <AppearancePreview value={draft.appearance} />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button disabled={!dirty || saving} onClick={() => setDraft(current)}>
          Discard
        </Button>
        <Button
          variant="primary"
          disabled={!dirty}
          loading={saving}
          onClick={save}
        >
          Save branding
        </Button>
      </div>
    </div>
  )
}
