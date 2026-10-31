import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import {
  Button,
  CopyField,
  ErrorText,
  FormDialog,
  TextField,
} from "@/components/app/ui-kit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiPost } from "@/lib/api-client"

export interface TwoFactorStatus {
  isEnabled: boolean
  isRequired: boolean
  requiredReason: string | null
  isConfigured: boolean
  globalRequired: boolean
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6)

/** Setup wizard: initiate -> scan / enter key -> confirm with a code -> show backup codes once. */
export function TwoFactorSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  const [setup, setSetup] = useState<{
    qrCodeDataUrl: string
    manualKey: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState("")
  const [pending, setPending] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!open || started.current) return
    started.current = true
    apiPost<{ qrCodeDataUrl: string; manualKey: string }>(
      "/2fa/setup/initiate",
      {}
    )
      .then(setSetup)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not start the setup")
      )
  }, [open])

  const reset = () => {
    started.current = false
    setSetup(null)
    setError(null)
    setToken("")
    setBackupCodes(null)
  }

  const close = async () => {
    if (!backupCodes && setup)
      await apiPost("/2fa/setup/cancel", {}).catch(() => {})
    await client.invalidateQueries({ queryKey: ["api", "/2fa/status"] })
    reset()
    onOpenChange(false)
  }

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (token.length !== 6) return
    setPending(true)
    setError(null)
    try {
      const res = await apiPost<{ backupCodes: string[] }>(
        "/2fa/setup/confirm",
        { token }
      )
      setBackupCodes(res.backupCodes)
      toast.success("Two-factor authentication enabled")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : void close())}
    >
      <DialogContent className="sm:max-w-lg">
        {backupCodes ? (
          <div className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Save your backup codes</DialogTitle>
              <DialogDescription>
                Each code can be used once if you lose access to your
                authenticator app. They are shown only now.
              </DialogDescription>
            </DialogHeader>
            <CopyField multiline value={backupCodes.join("\n")} />
            <DialogFooter>
              <Button variant="primary" onClick={() => void close()}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={confirm} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Set up two-factor authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with an authenticator app, or enter the key
                manually, then confirm with a code from the app.
              </DialogDescription>
            </DialogHeader>
            {setup ? (
              <div className="grid gap-4">
                <img
                  src={setup.qrCodeDataUrl}
                  alt="QR code for the authenticator app"
                  className="size-40 justify-self-center rounded-lg border bg-white p-2"
                />
                <CopyField
                  label="Can't scan? Enter this key manually"
                  value={setup.manualKey}
                />
                <TextField
                  label="Verification code"
                  value={token}
                  onChange={(e) => setToken(digits(e.target.value))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  className="max-w-48"
                />
              </div>
            ) : !error ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                Preparing setup…
              </p>
            ) : null}
            {error && (
              <ErrorText
                error={error}
                className="px-0 py-0 text-left text-[13px]"
              />
            )}
            <DialogFooter>
              <Button onClick={() => void close()} disabled={pending}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={pending}
                disabled={token.length !== 6}
              >
                Confirm
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TwoFactorDisableDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Disable two-factor authentication"
      description="Enter your password and a current verification code to turn it off."
      submitLabel="Disable"
      onSubmit={async (data) => {
        await apiPost("/2fa/disable", {
          password: String(data.get("password") ?? ""),
          token: String(data.get("token") ?? ""),
        })
        await client.invalidateQueries({ queryKey: ["api", "/2fa/status"] })
        toast.success("Two-factor authentication disabled")
      }}
    >
      <TextField
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <TextField
        label="Verification code"
        name="token"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        minLength={6}
        maxLength={6}
        pattern="[0-9]{6}"
        placeholder="123456"
        className="max-w-48"
      />
    </FormDialog>
  )
}
