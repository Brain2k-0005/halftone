import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { LoaderCircleIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Logo } from "@/components/app/logo"
import { Alert, AlertDescription } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginFn, meFn } from "@/lib/api"

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (await meFn()) throw redirect({ to: "/" })
  },
  head: () => ({ meta: [{ title: "Sign in · Umami" }] }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    const res = await loginFn({
      data: {
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
      },
    })
    if (res.ok) {
      await router.invalidate()
      await router.navigate({ to: "/" })
    } else {
      setError(res.error)
      setPending(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div
        className="bg-dither pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border bg-card shadow-xs">
            <Logo className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Sign in to Umami
            </h1>
            <p className="text-sm text-muted-foreground">
              Privacy-focused analytics for your websites
            </p>
          </div>
        </div>
        <form
          onSubmit={onSubmit}
          className="bg-dither flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="mt-1 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {pending && <LoaderCircleIcon className="animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </main>
  )
}
