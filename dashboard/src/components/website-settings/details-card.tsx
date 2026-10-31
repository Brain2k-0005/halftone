import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import { Button, CopyField, TextField } from "@/components/app/ui-kit"
import type { WebsiteInfo } from "@/components/behavior/website-info"
import { useApiMutation } from "@/lib/api-client"

export function DetailsCard({ website }: { website: WebsiteInfo }) {
  const [name, setName] = useState(website.name)
  const [domain, setDomain] = useState(website.domain)
  const save = useApiMutation<{ name: string; domain: string }>(
    "POST",
    `/websites/${website.id}`,
    ["/websites"]
  )

  useEffect(() => {
    setName(website.name)
    setDomain(website.domain)
  }, [website.name, website.domain])

  const dirty = name.trim() !== website.name || domain.trim() !== website.domain

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { name: name.trim(), domain: domain.trim() },
      {
        onSuccess: () => toast.success("Website saved"),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <SectionCard
      title="Details"
      description="Name and domain shown across the dashboard."
    >
      <form onSubmit={submit} className="grid gap-4 border-t px-5 py-5">
        <CopyField label="Website ID" value={website.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          <TextField
            label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            maxLength={500}
            placeholder="example.com"
          />
        </div>
        <div>
          <Button
            type="submit"
            variant="primary"
            loading={save.isPending}
            disabled={!dirty || !name.trim() || !domain.trim()}
          >
            Save changes
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
