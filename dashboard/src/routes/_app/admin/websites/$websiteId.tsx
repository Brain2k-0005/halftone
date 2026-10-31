import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { DetailRow, formatDate } from "@/components/admin/admin-parts"
import { SectionCard } from "@/components/app/section-card"
import {
  Button,
  ConfirmDialog,
  CopyField,
  EmptyState,
  ErrorText,
  FormDialog,
  PageHeader,
  Skeleton,
  TextField,
} from "@/components/app/ui-kit"
import { useApi, useApiMutation } from "@/lib/api-client"

export const Route = createFileRoute("/_app/admin/websites/$websiteId")({
  staticData: { crumb: { label: "Website", icon: "overview" } },
  head: () => ({ meta: [{ title: "Website · Administration · Halftone" }] }),
  component: AdminWebsitePage,
})

interface WebsiteDetail {
  id: string
  name: string
  domain: string
  userId: string | null
  teamId: string | null
  createdAt: string
}

const LINK =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium shadow-xs hover:bg-accent"

function AdminWebsitePage() {
  const { websiteId } = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter() // the sidebar lists websites from the /_app loader
  const website = useApi<WebsiteDetail>(`/websites/${websiteId}`)
  const w = website.data
  const owner = useApi<{ username?: string; name?: string }>(
    w?.teamId ? `/teams/${w.teamId}` : w?.userId ? `/users/${w.userId}` : null
  )
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const update = useApiMutation<{ name: string; domain: string }>(
    "POST",
    `/websites/${websiteId}`,
    [`/websites/${websiteId}`, "/admin/websites"]
  )
  const remove = useApiMutation("DELETE", `/websites/${websiteId}`, [
    "/websites",
    "/admin/websites",
  ])

  const ownerName = owner.data?.name ?? owner.data?.username

  if (website.isSuccess && !w) {
    return (
      <SectionCard>
        <EmptyState
          title="Website not found"
          description="It may have been deleted."
          action={
            <Link to="/admin/websites" className={LINK}>
              <ArrowLeftIcon className="size-4" /> Back to list
            </Link>
          }
        />
      </SectionCard>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={w?.name ?? <Skeleton className="h-6 w-40" />}
        description={w?.domain}
        actions={
          <>
            <Link to="/admin/websites" className={LINK}>
              <ArrowLeftIcon className="size-4" /> All websites
            </Link>
            <Link
              to={`/websites/${websiteId}/settings` as never}
              className={LINK}
            >
              Website settings
            </Link>
            <Button disabled={!w} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              disabled={!w}
              onClick={() => setDeleting(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      <SectionCard title="Details">
        <ErrorText error={website.error} />
        {w && (
          <dl className="divide-y border-t">
            <DetailRow label="Name">{w.name}</DetailRow>
            <DetailRow label="Domain">{w.domain}</DetailRow>
            <DetailRow label={w.teamId ? "Team" : "Owner"}>
              {ownerName ? (
                w.teamId ? (
                  <Link
                    to="/admin/teams/$teamId"
                    params={{ teamId: w.teamId }}
                    className="hover:underline"
                  >
                    {ownerName}
                  </Link>
                ) : (
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: w.userId! }}
                    className="hover:underline"
                  >
                    {ownerName}
                  </Link>
                )
              ) : (
                "–"
              )}
            </DetailRow>
            <DetailRow label="Created">{formatDate(w.createdAt)}</DetailRow>
            <div className="px-5 py-3">
              <CopyField label="Website ID" value={w.id} />
            </div>
          </dl>
        )}
        {!w && !website.error && <Skeleton className="m-5 mt-2 h-24" />}
      </SectionCard>

      {w && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title="Edit website"
          onSubmit={async (form) => {
            await update.mutateAsync({
              name: String(form.get("name")).trim(),
              domain: String(form.get("domain")).trim(),
            })
            toast.success("Website updated")
            await router.invalidate()
          }}
        >
          <TextField
            name="name"
            label="Name"
            defaultValue={w.name}
            required
            maxLength={100}
          />
          <TextField
            name="domain"
            label="Domain"
            defaultValue={w.domain}
            required
            maxLength={500}
          />
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${w?.name ?? "website"}?`}
        description="The website and all of its analytics data will be removed. This cannot be undone."
        onConfirm={async () => {
          await remove.mutateAsync(undefined)
          toast.success("Website deleted")
          await router.invalidate()
          await navigate({ to: "/admin/websites" })
        }}
      />
    </div>
  )
}
