import { Link, useLocation, useParams } from "@tanstack/react-router"
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  ACTIVE,
  Counter,
  GroupLabel,
  IDLE,
  NavRow,
  ROW,
  SidebarNav,
  UserCard,
} from "@/components/app/app-sidebar"
import { AppLogo } from "@/components/app/brand"
import { useCommandMenu } from "@/components/app/command-menu"
import {
  ADMIN_NAV,
  FOOTER_NAV,
  MAIN_NAV,
  SETTINGS_NAV,
  WEBSITE_NAV,
} from "@/components/app/nav"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Team, User, Website } from "@/lib/api"
import { useApi } from "@/lib/api-client"
import type { ShellId } from "@/lib/branding"
import { cn } from "@/lib/utils"

/*
 * The four desktop shells. `sidebar`, `inset` and `floating` share the full SidebarNav and only differ in the
 * chrome around it; `inbox` swaps it for an icon rail plus a secondary column (InboxNav).
 */

export interface ShellProps {
  user: User
  teams: Team[]
  teamId: string | null
  websites: (Website & { active: number })[]
  collapsed: boolean
  onToggle: () => void
  onLogout: () => void
}

export function DesktopShell({
  shell,
  children,
  ...nav
}: ShellProps & { shell: ShellId; children: ReactNode }) {
  const { collapsed } = nav

  if (shell === "inbox") {
    return (
      <div className="flex h-svh overflow-hidden">
        <InboxNav {...nav} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    )
  }

  const sidebar = (
    <aside
      className={cn(
        "hidden shrink-0 overflow-hidden bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-linear lg:block",
        collapsed ? "w-14" : "w-[248px]",
        shell === "sidebar" && "border-r border-[var(--sidebar-border)]",
        shell === "floating" &&
          "m-2 h-[calc(100svh-1rem)] rounded-xl border border-[var(--sidebar-border)] shadow-xs"
      )}
    >
      <SidebarNav {...nav} />
    </aside>
  )

  return (
    <div
      className={cn(
        "flex h-svh overflow-hidden",
        shell === "inset" && "bg-[var(--sidebar-bg)]",
        shell === "floating" &&
          "bg-[color-mix(in_oklab,var(--background)_92%,var(--foreground))]"
      )}
    >
      {sidebar}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          shell !== "sidebar" &&
            "overflow-hidden bg-background lg:m-2 lg:ml-0 lg:rounded-xl lg:border lg:shadow-xs"
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ inbox */

type Area =
  "overview" | "websites" | "boards" | "links" | "pixels" | "settings" | "admin"

const AREAS: { id: Area; label: string; to: string; icon: LucideIcon }[] = [
  ...MAIN_NAV.flatMap((g) => g.items).map((i) => ({
    id: (i.to === "/" ? "overview" : i.to.slice(1)) as Area,
    label: i.label,
    to: i.to,
    icon: i.icon,
  })),
]

function areaOf(pathname: string): Area {
  const first = pathname.split("/")[1]
  switch (first) {
    case "websites":
    case "boards":
    case "links":
    case "pixels":
    case "settings":
    case "admin":
      return first
    default:
      return "overview"
  }
}

const AREA_LABEL: Record<Area, string> = {
  overview: "Overview",
  websites: "Websites",
  boards: "Boards",
  links: "Links",
  pixels: "Pixels",
  settings: "Settings",
  admin: "Admin",
}

function RailButton({
  icon: Icon,
  label,
  to,
  active,
}: {
  icon: LucideIcon
  label: string
  to: string
  active: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={to as "/"}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors",
              active ? ACTIVE : IDLE
            )}
          >
            <Icon
              className={cn("size-[18px]", active && "text-brand")}
              strokeWidth={1.75}
            />
          </Link>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function DotRow({
  href,
  label,
  active,
  count = 0,
  online,
}: {
  href: string
  label: string
  active: boolean
  count?: number
  online?: boolean
}) {
  return (
    <Link
      to={href as "/"}
      aria-current={active ? "page" : undefined}
      className={cn(ROW, active ? ACTIVE : IDLE)}
    >
      <span
        className={cn(
          "mx-[5px] size-1.5 shrink-0 rounded-full",
          online ? "bg-success" : "bg-brand"
        )}
        aria-hidden
      />
      <span className="truncate whitespace-nowrap">{label}</span>
      <Counter count={count} />
    </Link>
  )
}

/** Short list of an area's items (boards, links, pixels) with a link to the full page. */
function EntityList({
  area,
  pathname,
}: {
  area: "boards" | "links" | "pixels"
  pathname: string
}) {
  const { data, isLoading } = useApi<{ data: { id: string; name: string }[] }>(
    `/${area}`
  )
  const items = data?.data ?? []
  return (
    <div className="space-y-0.5">
      <NavRow
        icon={AREAS.find((a) => a.id === area)!.icon}
        label={`All ${area}`}
        href={`/${area}`}
        active={pathname === `/${area}`}
        collapsed={false}
      />
      {items.length > 0 && <GroupLabel collapsed={false}>Recent</GroupLabel>}
      {items.slice(0, 12).map((it) => (
        <DotRow
          key={it.id}
          href={`/${area}/${it.id}`}
          label={it.name}
          active={pathname === `/${area}/${it.id}`}
        />
      ))}
      {!isLoading && items.length === 0 && (
        <p className="px-2.5 pt-2 text-[12px] text-[var(--sidebar-fg)] opacity-70">
          Nothing here yet.
        </p>
      )}
    </div>
  )
}

function SecondaryColumn({
  area,
  user,
  websites,
  onToggle,
}: {
  area: Area
  user: User
  websites: ShellProps["websites"]
  onToggle: () => void
}) {
  const { pathname } = useLocation()
  const { open } = useCommandMenu()
  const { websiteId } = useParams({ strict: false }) as { websiteId?: string }
  const current = websites.find((w) => w.id === websiteId)

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/")

  return (
    <div className="flex h-full w-[232px] flex-col">
      <div className="flex h-[52px] shrink-0 items-center gap-2 px-3.5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-[var(--sidebar-fg-active)]">
          {AREA_LABEL[area]}
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="-mr-1 inline-flex size-7 items-center justify-center rounded-md text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]"
        >
          <PanelLeftCloseIcon className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={open}
          aria-label="Search"
          className="flex h-8 w-full items-center gap-2 rounded-lg border bg-background px-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors hover:text-foreground"
        >
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Search …</span>
          <kbd className="rounded border bg-muted px-1.5 py-px font-sans text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>
      <nav
        aria-label={AREA_LABEL[area]}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-3"
      >
        {area === "websites" && current && (
          <>
            <div className="space-y-0.5 pb-1">
              <NavRow
                icon={AREAS[1].icon}
                label="All websites"
                href="/websites"
                active={false}
                collapsed={false}
              />
            </div>
            {WEBSITE_NAV.map((group, gi) => (
              <div key={group.label}>
                <GroupLabel collapsed={false}>
                  {gi === 0 ? current.name : group.label}
                </GroupLabel>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = `/websites/${current.id}${item.path}`
                    return (
                      <NavRow
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        href={href}
                        active={isActive(href, item.path === "")}
                        collapsed={false}
                        count={item.path === "/realtime" ? current.active : 0}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {area === "websites" && !current && (
          <div className="space-y-0.5">
            <NavRow
              icon={AREAS[1].icon}
              label="All websites"
              href="/websites"
              active={pathname === "/websites"}
              collapsed={false}
            />
            {websites.length > 0 && (
              <GroupLabel collapsed={false}>Your websites</GroupLabel>
            )}
            {websites.map((w) => (
              <DotRow
                key={w.id}
                href={`/websites/${w.id}`}
                label={w.name}
                active={false}
                count={w.active}
                online={w.active > 0}
              />
            ))}
          </div>
        )}

        {area === "overview" && (
          <div className="space-y-0.5">
            <NavRow
              icon={AREAS[0].icon}
              label="Overview"
              href="/"
              active={pathname === "/"}
              collapsed={false}
            />
            {websites.length > 0 && (
              <GroupLabel collapsed={false}>Quick access</GroupLabel>
            )}
            {websites.slice(0, 8).map((w) => (
              <DotRow
                key={w.id}
                href={`/websites/${w.id}`}
                label={w.name}
                active={false}
                count={w.active}
                online={w.active > 0}
              />
            ))}
          </div>
        )}

        {(area === "boards" || area === "links" || area === "pixels") && (
          <EntityList area={area} pathname={pathname} />
        )}

        {area === "settings" && (
          <div className="space-y-0.5">
            {SETTINGS_NAV.map((item) => (
              <NavRow
                key={item.to}
                icon={item.icon}
                label={item.label}
                href={item.to}
                active={isActive(item.to)}
                collapsed={false}
              />
            ))}
          </div>
        )}

        {area === "admin" && (
          <div className="space-y-0.5">
            {ADMIN_NAV.filter((i) => !i.admin || user.isAdmin).map((item) => (
              <NavRow
                key={item.to}
                icon={item.icon}
                label={item.label}
                href={item.to}
                active={isActive(item.to)}
                collapsed={false}
              />
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

/** Inbox shell: 56 px icon rail for the areas, plus a collapsible secondary column for the active area. */
export function InboxNav({
  user,
  teams,
  teamId,
  websites,
  collapsed,
  onToggle,
  onLogout,
}: ShellProps) {
  const { pathname } = useLocation()
  const area = areaOf(pathname)
  const footer = FOOTER_NAV.filter((i) => !i.admin || user.isAdmin)

  return (
    <aside className="hidden shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:flex">
      <div
        className={cn(
          "flex w-14 shrink-0 flex-col items-center",
          !collapsed && "border-r border-[var(--sidebar-border)]"
        )}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-center">
          <AppLogo className="size-[22px] text-[var(--sidebar-fg-active)]" />
        </div>
        <nav aria-label="Areas" className="flex flex-1 flex-col gap-1 pt-1">
          {AREAS.map((a) => (
            <RailButton
              key={a.id}
              icon={a.icon}
              label={a.label}
              to={a.to}
              active={area === a.id}
            />
          ))}
        </nav>
        <div className="flex flex-col items-center gap-1 pb-1">
          {collapsed && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={onToggle}
                    aria-label="Expand sidebar"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      IDLE
                    )}
                  >
                    <PanelLeftOpenIcon className="size-4" strokeWidth={1.75} />
                  </button>
                }
              />
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          )}
          {footer.map((item) => {
            const id = item.to.split("/")[1] as Area
            return (
              <RailButton
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                active={area === id}
              />
            )
          })}
        </div>
        <UserCard
          user={user}
          teams={teams}
          teamId={teamId}
          collapsed
          onLogout={onLogout}
          menuSide="right"
          menuAlign="end"
        />
      </div>
      <div
        className={cn(
          "overflow-hidden transition-[width] duration-200 ease-linear",
          collapsed ? "w-0" : "w-[232px]"
        )}
        aria-hidden={collapsed}
        inert={collapsed}
      >
        <SecondaryColumn
          area={area}
          user={user}
          websites={websites}
          onToggle={onToggle}
        />
      </div>
    </aside>
  )
}
