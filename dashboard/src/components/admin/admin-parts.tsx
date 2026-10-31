import { SearchIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Pill, SectionCard, type Tone } from "@/components/app/section-card"
import { Button, ConfirmDialog } from "@/components/app/ui-kit"
import { Switch } from "@/components/ui/switch"
import { useApi, useApiMutation, type Paged } from "@/lib/api-client"

export function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en", { dateStyle: "medium" })
    : "–"
}

const ROLE: Record<string, { label: string; tone: Tone }> = {
  admin: { label: "Admin", tone: "brand" },
  user: { label: "User", tone: "neutral" },
  "view-only": { label: "View only", tone: "info" },
  "team-owner": { label: "Owner", tone: "brand" },
  "team-manager": { label: "Manager", tone: "success" },
  "team-member": { label: "Member", tone: "neutral" },
  "team-view-only": { label: "View only", tone: "info" },
}

export function RolePill({ role }: { role: string }) {
  const r = ROLE[role] ?? { label: role, tone: "neutral" as Tone }
  return <Pill tone={r.tone}>{r.label}</Pill>
}

export const USER_ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "view-only", label: "View only" },
]

/** Search box that reports its value 300 ms after the last keystroke. */
export function SearchInput({
  onChange,
  placeholder = "Search …",
}: {
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [value, setValue] = useState("")
  const callback = useRef(onChange)
  callback.current = onChange
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => callback.current(value.trim()), 300)
    return () => clearTimeout(t)
  }, [value])
  return (
    <label className="relative block">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="h-8 w-56 rounded-lg border border-input bg-background pr-3 pl-8 text-[13px] transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}

/** Paged + searchable list endpoint. */
export function usePagedList<T>(path: string) {
  const [search, setSearchState] = useState("")
  const [page, setPage] = useState(1)
  const query = useApi<Paged<T>>(path, { page, pageSize: 20, search })
  const setSearch = (value: string) => {
    setSearchState(value)
    setPage(1)
  }
  return { query, page, setPage, search, setSearch }
}

export function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[13px] font-medium break-words">
        {children}
      </dd>
    </div>
  )
}

interface TwoFactorStatus {
  isConfigured: boolean
  globalRequired: boolean
}

/** 2FA enforcement for a user or team (admin endpoints `/admin/{users|teams}/:id/2fa`), plus reset for users. */
export function TwoFactorCard({
  kind,
  id,
  required,
}: {
  kind: "users" | "teams"
  id: string
  required: boolean
}) {
  const path = `/admin/${kind}/${id}/2fa`
  const invalidate = [`/${kind}/${id}`, `/admin/${kind}`]
  const status = useApi<TwoFactorStatus>("/2fa/status")
  const own = useApi<{ isEnabled: boolean }>(kind === "users" ? path : null)
  const setRequired = useApiMutation<{ required: boolean }>(
    "POST",
    path,
    invalidate
  )
  const reset = useApiMutation("DELETE", path, invalidate)
  const [confirm, setConfirm] = useState(false)

  const globalRequired = status.data?.globalRequired ?? false
  const configured = status.data?.isConfigured ?? true
  const enabled = own.data?.isEnabled ?? false
  const noun = kind === "users" ? "user" : "team"

  return (
    <SectionCard
      title="Two-factor authentication"
      description={`Require a second factor for this ${noun}`}
      actions={
        kind === "users" && (
          <Pill tone={enabled ? "success" : "neutral"} dot>
            {enabled ? "Active" : "Not set up"}
          </Pill>
        )
      }
    >
      <div className="grid gap-4 border-t px-5 py-4">
        <label className="flex items-center gap-3 text-[13px]">
          <Switch
            checked={globalRequired || required}
            disabled={
              globalRequired ||
              (!configured && !required) ||
              setRequired.isPending
            }
            onCheckedChange={(checked) =>
              setRequired.mutate(
                { required: checked },
                { onError: (e) => toast.error(e.message) }
              )
            }
          />
          Require two-factor authentication for this {noun}
        </label>
        {globalRequired && (
          <p className="text-xs text-muted-foreground">
            Two-factor authentication is required globally for everyone.
          </p>
        )}
        {!configured && (
          <p className="text-xs text-muted-foreground">
            Two-factor authentication is not configured on this server (missing
            encryption secret).
          </p>
        )}
        {kind === "users" && enabled && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="max-w-md text-xs text-muted-foreground">
              Resetting removes the user&apos;s authenticator and backup codes.
              They can set it up again at next login.
            </p>
            <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
              Reset 2FA
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset two-factor authentication?"
        description="The authenticator app and all backup codes of this user will be removed."
        confirmLabel="Reset"
        onConfirm={async () => {
          await reset.mutateAsync(undefined)
          toast.success("Two-factor authentication reset")
        }}
      />
    </SectionCard>
  )
}
