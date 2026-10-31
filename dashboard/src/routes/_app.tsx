import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatches,
  useRouter,
} from "@tanstack/react-router"
import {
  ActivityIcon,
  GlobeIcon,
  LayoutGridIcon,
  MenuIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react"
import { Fragment, useEffect, useState } from "react"
import { SidebarNav } from "@/components/app/app-sidebar"
import {
  CommandMenuProvider,
  useCommandMenu,
} from "@/components/app/command-menu"
import { ThemeToggle } from "@/components/app/theme"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { logoutFn, meFn, teamsFn, websitesFn } from "@/lib/api"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await meFn()
    if (!user) throw redirect({ to: "/login" })
    return { user }
  },
  loader: async ({ context }) => {
    const [websites, { teams, teamId }] = await Promise.all([websitesFn(), teamsFn()])
    return { user: context.user, websites, teams, teamId }
  },
  component: AppLayout,
})

export interface Crumb {
  label: string
  to?: string
  params?: Record<string, string>
  icon?: "overview" | "websites" | "website" | "realtime"
}

const CRUMB_ICONS: Record<NonNullable<Crumb["icon"]>, LucideIcon> = {
  overview: LayoutGridIcon,
  websites: GlobeIcon,
  website: GlobeIcon,
  realtime: ActivityIcon,
}

/** Slim top bar: breadcrumb with icon on the left, search and theme on the right. */
function TopBar({ onMenu }: { onMenu: () => void }) {
  const { open } = useCommandMenu()
  const matches = useMatches()
  const crumbs = matches.flatMap((m) => {
    const data = m.loaderData as { crumb?: Crumb } | undefined
    const staticCrumb = (m.staticData as { crumb?: Crumb } | undefined)?.crumb
    const crumb = data?.crumb ?? staticCrumb
    return crumb ? [crumb] : []
  })
  const Icon = CRUMB_ICONS[crumbs[0]?.icon ?? "overview"]

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b bg-background px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="-ml-1 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
      >
        <MenuIcon className="size-4" />
      </button>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-[13px]"
      >
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
        />
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {!last && c.to ? (
                <Link
                  to={c.to}
                  params={c.params}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">
                  {c.label}
                </span>
              )}
            </Fragment>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={open}
          aria-label="Search"
          className="hidden h-8 w-56 items-center gap-2 rounded-lg border bg-card px-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors hover:text-foreground md:flex"
        >
          <SearchIcon className="size-3.5" />
          <span className="flex-1 text-left">Search …</span>
          <kbd className="rounded border bg-muted px-1.5 py-px font-sans text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={open}
          aria-label="Search"
          className="inline-flex size-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent md:hidden"
        >
          <SearchIcon className="size-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

const COLLAPSED_KEY = "umami-sidebar-collapsed"

function AppLayout() {
  const { user, websites, teams, teamId } = Route.useLoaderData()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1")
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1")
      return !c
    })
  }

  const logout = async () => {
    await logoutFn()
    await router.invalidate()
    await router.navigate({ to: "/login" })
  }

  return (
    <CommandMenuProvider websites={websites} onLogout={logout}>
      <div className="flex h-svh overflow-hidden">
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-linear lg:block",
            collapsed ? "w-14" : "w-[248px]"
          )}
        >
          <SidebarNav
            user={user}
            teams={teams}
            teamId={teamId}
            websites={websites}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            onLogout={logout}
          />
        </aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[280px] bg-[var(--sidebar-bg)] p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav
              user={user}
              teams={teams}
              teamId={teamId}
              websites={websites}
              collapsed={false}
              onLogout={logout}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMobileOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-10 lg:px-6 lg:py-6">
            <div className="mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </CommandMenuProvider>
  )
}
