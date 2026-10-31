import { Link, useMatchRoute, useParams } from "@tanstack/react-router"
import {
  ActivityIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"
import { useCommandMenu } from "@/components/app/command-menu"
import { Logo } from "@/components/app/logo"
import { useTheme } from "@/components/app/theme"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { User, Website } from "@/lib/api"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * Sidebar after the ReUI templates (same as the Foto Waschbaer dashboard): brand on top, the search field
 * (opens the command menu), the groups, then "Quick access" with coloured dots and counters, the user card at the bottom.
 */

type NavTarget =
  | { to: "/" | "/websites" }
  | {
      to: "/websites/$websiteId" | "/websites/$websiteId/realtime"
      params: { websiteId: string }
    }

const ROW =
  "relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors"
const IDLE =
  "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]"
const ACTIVE = "bg-[var(--sidebar-active)] text-[var(--sidebar-fg-active)]"

function Counter({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="tabular ml-auto inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-success-soft px-1.5 text-[11px] leading-none font-medium text-success">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function GroupLabel({
  children,
  collapsed,
  first,
}: {
  children: string
  collapsed: boolean
  first?: boolean
}) {
  if (collapsed)
    return first ? null : (
      <div className="my-2 h-px bg-[var(--sidebar-border)]" />
    )
  return (
    <p
      className={cn(
        "truncate px-2.5 pt-4 pb-1.5 text-[11px] font-medium text-[var(--sidebar-fg)] opacity-70",
        first && "pt-1"
      )}
    >
      {children}
    </p>
  )
}

function NavRow({
  icon: Icon,
  label,
  active,
  collapsed,
  count = 0,
  link,
  onNavigate,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  collapsed: boolean
  count?: number
  link: NavTarget
  onNavigate?: () => void
}) {
  const row = (
    <Link
      to={link.to}
      params={"params" in link ? link.params : undefined}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW,
        active ? ACTIVE : IDLE,
        collapsed && "justify-center px-0"
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active && "text-brand")}
        strokeWidth={1.75}
      />
      {!collapsed && (
        <span className="truncate whitespace-nowrap">{label}</span>
      )}
      {!collapsed && <Counter count={count} />}
    </Link>
  )
  if (!collapsed) return row
  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function UserCard({
  user,
  collapsed,
  onLogout,
}: {
  user: User
  collapsed: boolean
  onLogout: () => void
}) {
  const { theme, toggle } = useTheme()
  return (
    <div className="p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border bg-card p-2 text-left shadow-xs transition-colors hover:bg-[var(--sidebar-hover)]",
                collapsed &&
                  "justify-center border-transparent bg-transparent p-1 shadow-none"
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand-deep">
                  {initials(user.username)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight font-medium">
                      {user.username}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-muted-foreground capitalize">
                      {user.role}
                    </p>
                  </div>
                  <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          }
        />
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggle}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            {theme === "light" ? "Dark theme" : "Light theme"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOutIcon /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function SidebarNav({
  user,
  websites,
  collapsed,
  onToggle,
  onLogout,
  onNavigate,
}: {
  user: User
  websites: (Website & { active: number })[]
  collapsed: boolean
  onToggle?: () => void
  onLogout: () => void
  onNavigate?: () => void
}) {
  const matchRoute = useMatchRoute()
  const { open } = useCommandMenu()
  const { websiteId } = useParams({ strict: false }) as { websiteId?: string }
  const current = websites.find((w) => w.id === websiteId)

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center gap-2.5 px-3.5",
          collapsed && "justify-center px-0"
        )}
      >
        <Logo className="size-[22px] shrink-0 text-[var(--sidebar-fg-active)]" />
        {!collapsed && (
          <>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-[var(--sidebar-fg-active)]">
              Umami
            </p>
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-label="Collapse sidebar"
                className="-mr-1 inline-flex size-7 items-center justify-center rounded-md text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]"
              >
                <PanelLeftCloseIcon className="size-4" strokeWidth={1.75} />
              </button>
            )}
          </>
        )}
      </div>

      {collapsed && onToggle && (
        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="flex h-8 w-full items-center justify-center rounded-lg text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]"
          >
            <PanelLeftOpenIcon className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={open}
          aria-label="Search"
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg border bg-background px-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors hover:text-foreground",
            collapsed &&
              "justify-center border-transparent bg-transparent px-0 shadow-none"
          )}
        >
          <SearchIcon className="size-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search …</span>
              <kbd className="rounded border bg-muted px-1.5 py-px font-sans text-[10px] font-medium">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav
        aria-label="Navigation"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-2"
      >
        <GroupLabel collapsed={collapsed} first>
          Analytics
        </GroupLabel>
        <div className="space-y-0.5">
          <NavRow
            icon={LayoutGridIcon}
            label="Overview"
            active={!!matchRoute({ to: "/" })}
            collapsed={collapsed}
            link={{ to: "/" }}
            onNavigate={onNavigate}
          />
          <NavRow
            icon={GlobeIcon}
            label="Websites"
            active={!!matchRoute({ to: "/websites" })}
            collapsed={collapsed}
            link={{ to: "/websites" }}
            onNavigate={onNavigate}
          />
        </div>

        {current && (
          <>
            <GroupLabel collapsed={collapsed}>{current.name}</GroupLabel>
            <div className="space-y-0.5">
              <NavRow
                icon={LayoutGridIcon}
                label="Dashboard"
                active={
                  !!matchRoute({
                    to: "/websites/$websiteId",
                    params: { websiteId: current.id },
                  })
                }
                collapsed={collapsed}
                link={{
                  to: "/websites/$websiteId",
                  params: { websiteId: current.id },
                }}
                onNavigate={onNavigate}
              />
              <NavRow
                icon={ActivityIcon}
                label="Realtime"
                active={
                  !!matchRoute({
                    to: "/websites/$websiteId/realtime",
                    params: { websiteId: current.id },
                  })
                }
                collapsed={collapsed}
                count={current.active}
                link={{
                  to: "/websites/$websiteId/realtime",
                  params: { websiteId: current.id },
                }}
                onNavigate={onNavigate}
              />
            </div>
          </>
        )}

        {!collapsed && websites.length > 0 && (
          <div>
            <GroupLabel collapsed={collapsed}>Quick access</GroupLabel>
            <div className="space-y-0.5">
              {websites.slice(0, 8).map((w) => (
                <Link
                  key={w.id}
                  to="/websites/$websiteId"
                  params={{ websiteId: w.id }}
                  onClick={onNavigate}
                  className={cn(ROW, w.id === websiteId ? ACTIVE : IDLE)}
                >
                  <span
                    className={cn(
                      "mx-[5px] size-1.5 shrink-0 rounded-full",
                      w.active > 0 ? "bg-success" : "bg-brand"
                    )}
                    aria-hidden
                  />
                  <span className="truncate whitespace-nowrap">{w.name}</span>
                  <Counter count={w.active} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--sidebar-border)]" />
      <UserCard user={user} collapsed={collapsed} onLogout={onLogout} />
    </div>
  )
}
