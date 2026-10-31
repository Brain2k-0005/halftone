import { Link, useMatchRoute, useParams } from "@tanstack/react-router"
import {
  ActivityIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LayoutGridIcon,
  LogOutIcon,
  PanelLeftIcon,
} from "lucide-react"
import { Logo } from "@/components/app/logo"
import { SearchButton } from "@/components/app/command-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import type { User, Website } from "@/lib/api"
import { initials } from "@/lib/format"

export function AppSidebar({
  user,
  websites,
  onLogout,
}: {
  user: User
  websites: Website[]
  onLogout: () => void
}) {
  const matchRoute = useMatchRoute()
  const { toggleSidebar } = useSidebar()
  const { websiteId } = useParams({ strict: false }) as { websiteId?: string }
  const current = websites.find((w) => w.id === websiteId)

  const isOverview = !!matchRoute({ to: "/" })
  const isWebsites = !!matchRoute({ to: "/websites" })

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="gap-3">
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <Link
            to="/"
            className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"
          >
            <Logo className="size-5" />
            <span className="text-sm font-semibold tracking-tight">Umami</span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <PanelLeftIcon className="size-4" />
          </button>
        </div>
        <SearchButton className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isOverview}
                tooltip="Overview"
                render={<Link to="/" />}
              >
                <LayoutGridIcon />
                <span>Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isWebsites}
                tooltip="Websites"
                render={<Link to="/websites" />}
              >
                <GlobeIcon />
                <span>Websites</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {current && (
          <SidebarGroup>
            <SidebarGroupLabel className="truncate">
              {current.name}
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    !!matchRoute({
                      to: "/websites/$websiteId",
                      params: { websiteId: current.id },
                    })
                  }
                  tooltip="Dashboard"
                  render={
                    <Link
                      to="/websites/$websiteId"
                      params={{ websiteId: current.id }}
                    />
                  }
                >
                  <LayoutGridIcon />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    !!matchRoute({
                      to: "/websites/$websiteId/realtime",
                      params: { websiteId: current.id },
                    })
                  }
                  tooltip="Realtime"
                  render={
                    <Link
                      to="/websites/$websiteId/realtime"
                      params={{ websiteId: current.id }}
                    />
                  }
                >
                  <ActivityIcon />
                  <span>Realtime</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {websites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick access</SidebarGroupLabel>
            <SidebarMenu>
              {websites.slice(0, 8).map((w) => (
                <SidebarMenuItem key={w.id}>
                  <SidebarMenuButton
                    isActive={w.id === websiteId}
                    tooltip={w.name}
                    render={
                      <Link
                        to="/websites/$websiteId"
                        params={{ websiteId: w.id }}
                      />
                    }
                  >
                    <span className="flex size-4 items-center justify-center">
                      <span className="size-1.5 rounded-full bg-brand" />
                    </span>
                    <span className="truncate">{w.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-semibold">
                        {initials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.username}
                      </span>
                      <span className="truncate text-xs text-muted-foreground capitalize">
                        {user.role}
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Signed in as {user.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOutIcon /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
