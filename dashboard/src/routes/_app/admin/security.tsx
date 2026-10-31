import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { Pill, SectionCard } from "@/components/app/section-card"
import { Skeleton } from "@/components/app/ui-kit"
import { Switch } from "@/components/ui/switch"
import { useApi, useApiMutation } from "@/lib/api-client"

export const Route = createFileRoute("/_app/admin/security")({
  staticData: { crumb: { label: "Security", icon: "overview" } },
  head: () => ({ meta: [{ title: "Security · Administration · Halftone" }] }),
  component: AdminSecurityPage,
})

function AdminSecurityPage() {
  const status = useApi<{ isConfigured: boolean; globalRequired: boolean }>(
    "/2fa/status"
  )
  const setGlobal = useApiMutation<{ required: boolean }>(
    "POST",
    "/admin/2fa/global",
    ["/2fa"]
  )

  const configured = status.data?.isConfigured ?? true
  const required = status.data?.globalRequired ?? false

  return (
    <SectionCard
      title="Two-factor authentication"
      description="Require every user to secure their account with a second factor"
      actions={
        status.data && (
          <Pill tone={required ? "success" : "neutral"} dot>
            {required ? "Required for everyone" : "Optional"}
          </Pill>
        )
      }
    >
      <div className="grid gap-4 border-t px-5 py-4">
        {status.isLoading ? (
          <Skeleton className="h-5 w-72" />
        ) : (
          <label className="flex items-center gap-3 text-[13px]">
            <Switch
              checked={required}
              disabled={(!configured && !required) || setGlobal.isPending}
              onCheckedChange={(checked) =>
                setGlobal.mutate(
                  { required: checked },
                  {
                    onSuccess: () =>
                      toast.success(
                        checked
                          ? "Two-factor authentication is now required"
                          : "Two-factor authentication is now optional"
                      ),
                    onError: (e) => toast.error(e.message),
                  }
                )
              }
            />
            Require two-factor authentication for all users
          </label>
        )}
        {status.error && (
          <p className="text-xs text-destructive">{status.error.message}</p>
        )}
        {!configured && (
          <p className="text-xs text-muted-foreground">
            Two-factor authentication is not configured on this server (missing
            encryption secret), so it cannot be enabled.
          </p>
        )}
        {configured && required && (
          <p className="text-xs text-muted-foreground">
            This overrides the per-user and per-team settings: every user must
            set up an authenticator at next login.
          </p>
        )}
      </div>
    </SectionCard>
  )
}
