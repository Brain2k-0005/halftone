import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatches,
  useRouter,
} from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"
import { Fragment } from "react"
import { AppSidebar } from "@/components/app/app-sidebar"
import {
  CommandMenuProvider,
  SearchButton,
} from "@/components/app/command-menu"
import { ThemeToggle } from "@/components/app/theme"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { logoutFn, meFn, websitesFn } from "@/lib/api"

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await meFn()
    if (!user) throw redirect({ to: "/login" })
    return { user }
  },
  loader: async ({ context }) => ({
    user: context.user,
    websites: await websitesFn(),
  }),
  component: AppLayout,
})

export interface Crumb {
  label: string
  to?: string
  params?: Record<string, string>
}

function Breadcrumbs() {
  const matches = useMatches()
  const crumbs = matches.flatMap((m) => {
    const data = m.loaderData as { crumb?: Crumb } | undefined
    const staticCrumb = (m.staticData as { crumb?: Crumb } | undefined)?.crumb
    const crumb = data?.crumb ?? staticCrumb
    return crumb ? [crumb] : []
  })

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && (
              <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {last || !c.to ? (
              <span
                className={
                  last
                    ? "truncate font-semibold"
                    : "truncate text-muted-foreground"
                }
              >
                {c.label}
              </span>
            ) : (
              <Link
                to={c.to}
                params={c.params}
                className="truncate text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

function AppLayout() {
  const { user, websites } = Route.useLoaderData()
  const router = useRouter()

  const logout = async () => {
    await logoutFn()
    await router.invalidate()
    await router.navigate({ to: "/login" })
  }

  return (
    <CommandMenuProvider websites={websites} onLogout={logout}>
      <SidebarProvider>
        <AppSidebar user={user} websites={websites} onLogout={logout} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-2">
              <SearchButton className="hidden w-56 sm:flex" />
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </CommandMenuProvider>
  )
}
