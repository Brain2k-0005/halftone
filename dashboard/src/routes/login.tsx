import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { LoaderCircleIcon } from "lucide-react"
import { useState, type ComponentProps, type FormEvent } from "react"
import { Logo } from "@/components/app/logo"
import { loginFn, meFn } from "@/lib/api"

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (await meFn()) throw redirect({ to: "/" })
  },
  head: () => ({ meta: [{ title: "Sign in · Umami" }] }),
  component: LoginPage,
})

function Field({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        {...props}
        className="min-h-12 w-full rounded-xl border border-input bg-background px-4 text-[15px] transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}

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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-[52px] items-center gap-2.5 px-5">
        <Logo className="size-[22px]" />
        <span className="text-sm font-semibold tracking-tight">Umami</span>
      </header>
      <main className="flex flex-1 flex-col justify-center px-5 py-8">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="mb-2 text-[28px] leading-tight font-bold tracking-tight">
            Sign in
          </h1>
          <p className="mb-8 text-[15px] text-muted-foreground">
            Privacy-focused analytics for your websites.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field
              label="Username"
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              required
            />
            <Field
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending && <LoaderCircleIcon className="size-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
