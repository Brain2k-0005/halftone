import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/app/section-card"
import { Button, TextField } from "@/components/app/ui-kit"
import { ROLE_LABEL } from "@/components/settings/team-roles"
import { apiPost } from "@/lib/api-client"

export const Route = createFileRoute("/_app/settings/profile")({
  staticData: { crumb: { label: "Profile", icon: "overview" } },
  head: () => ({ meta: [{ title: "Profile · Umami" }] }),
  component: ProfilePage,
})

const appRoute = getRouteApi("/_app")

function ProfilePage() {
  const { user } = appRoute.useLoaderData()
  const [pending, setPending] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Account" description="Your sign-in details.">
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <TextField label="Username" value={user.username} readOnly />
          <TextField
            label="Role"
            value={ROLE_LABEL[user.role] ?? user.role}
            readOnly
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Change password"
        description="Use at least 8 characters."
      >
        <form
          className="grid gap-4 px-5 pb-5"
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.currentTarget
            const data = new FormData(form)
            const newPassword = String(data.get("newPassword"))
            if (newPassword !== String(data.get("confirmPassword"))) {
              setMismatch(true)
              return
            }
            setMismatch(false)
            setPending(true)
            try {
              await apiPost("/me/password", {
                currentPassword: String(data.get("currentPassword")),
                newPassword,
              })
              form.reset()
              toast.success("Password changed")
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Could not change the password"
              )
            } finally {
              setPending(false)
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Current password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
            <TextField
              label="New password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <TextField
              label="Confirm password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              hint={
                mismatch ? (
                  <span className="text-destructive">
                    Passwords do not match.
                  </span>
                ) : undefined
              }
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={pending}>
              Change password
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
