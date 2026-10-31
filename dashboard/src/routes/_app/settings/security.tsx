import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Pill, SectionCard } from "@/components/app/section-card"
import { Button, ErrorText, Skeleton } from "@/components/app/ui-kit"
import {
  TwoFactorDisableDialog,
  TwoFactorSetupDialog,
  type TwoFactorStatus,
} from "@/components/settings/two-factor"
import { useApi } from "@/lib/api-client"

export const Route = createFileRoute("/_app/settings/security")({
  staticData: { crumb: { label: "Security", icon: "overview" } },
  head: () => ({ meta: [{ title: "Security · Umami" }] }),
  component: SecurityPage,
})

function SecurityPage() {
  const {
    data: status,
    isLoading,
    error,
  } = useApi<TwoFactorStatus>("/2fa/status")
  const [setup, setSetup] = useState(false)
  const [disable, setDisable] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Two-factor authentication"
        description="Protect your account with a one-time code from an authenticator app."
        actions={
          status &&
          (status.isEnabled ? (
            <Pill tone="success" dot>
              Active
            </Pill>
          ) : (
            <Pill>Not configured</Pill>
          ))
        }
      >
        {error ? (
          <ErrorText error={error} />
        ) : isLoading || !status ? (
          <div className="px-5 pb-5">
            <Skeleton className="h-8 w-40" />
          </div>
        ) : (
          <div className="grid gap-4 px-5 pb-5">
            {!status.isConfigured ? (
              <p className="text-[13px] text-muted-foreground">
                Two-factor authentication is not available: the server has no
                encryption key configured for it.
              </p>
            ) : status.isEnabled ? (
              <p className="text-[13px] text-muted-foreground">
                Two-factor authentication is active. You need a verification
                code to sign in.
                {status.isRequired &&
                  " It is required for your account and cannot be disabled."}
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Add a second step to signing in. You will scan a QR code with an
                authenticator app and receive backup codes.
              </p>
            )}
            {status.isConfigured && (
              <div>
                {status.isEnabled ? (
                  <Button
                    variant="danger"
                    disabled={status.isRequired}
                    onClick={() => setDisable(true)}
                  >
                    Disable two-factor authentication
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setSetup(true)}>
                    Enable two-factor authentication
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <TwoFactorSetupDialog open={setup} onOpenChange={setSetup} />
      <TwoFactorDisableDialog open={disable} onOpenChange={setDisable} />
    </div>
  )
}
