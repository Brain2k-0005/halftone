import {
  ActivityIcon,
  BarChart3Icon,
  BoxesIcon,
  ChartPieIcon,
  CircleGaugeIcon,
  ContactIcon,
  CrosshairIcon,
  DollarSignIcon,
  EyeIcon,
  FilterIcon,
  FlameIcon,
  GaugeIcon,
  GitCompareIcon,
  GlobeIcon,
  Grid2x2Icon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LinkIcon,
  ListTreeIcon,
  MagnetIcon,
  RepeatIcon,
  RouteIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

/*
 * Single source of truth for navigation (sidebar, command menu, breadcrumbs icons).
 * Website items are relative to /websites/$websiteId; `path: ""` is the website dashboard.
 */

export interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  /** Only for admins. */
  admin?: boolean
}

export interface WebsiteNavItem {
  label: string
  icon: LucideIcon
  path: string
}

export const MAIN_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Analytics",
    items: [
      { label: "Overview", icon: LayoutGridIcon, to: "/" },
      { label: "Websites", icon: GlobeIcon, to: "/websites" },
      { label: "Boards", icon: LayoutDashboardIcon, to: "/boards" },
      { label: "Links", icon: LinkIcon, to: "/links" },
      { label: "Pixels", icon: Grid2x2Icon, to: "/pixels" },
    ],
  },
]

export const WEBSITE_NAV: { label: string; items: WebsiteNavItem[] }[] = [
  {
    label: "Traffic",
    items: [
      { label: "Dashboard", icon: EyeIcon, path: "" },
      { label: "Events", icon: ZapIcon, path: "/events" },
      { label: "Sessions", icon: UserIcon, path: "/sessions" },
      { label: "Realtime", icon: ActivityIcon, path: "/realtime" },
      { label: "Performance", icon: GaugeIcon, path: "/performance" },
      { label: "Compare", icon: GitCompareIcon, path: "/compare" },
      { label: "Breakdown", icon: ListTreeIcon, path: "/breakdown" },
    ],
  },
  {
    label: "Behavior",
    items: [
      { label: "Goals", icon: CrosshairIcon, path: "/goals" },
      { label: "Funnels", icon: FilterIcon, path: "/funnels" },
      { label: "Journeys", icon: RouteIcon, path: "/journeys" },
      { label: "Retention", icon: RepeatIcon, path: "/retention" },
      { label: "Replays", icon: VideoIcon, path: "/replays" },
      { label: "Heatmaps", icon: FlameIcon, path: "/heatmaps" },
    ],
  },
  {
    label: "Audience",
    items: [
      { label: "Segments", icon: ChartPieIcon, path: "/segments" },
      { label: "Cohorts", icon: ContactIcon, path: "/cohorts" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "UTM", icon: TagIcon, path: "/utm" },
      { label: "Revenue", icon: DollarSignIcon, path: "/revenue" },
      { label: "Attribution", icon: MagnetIcon, path: "/attribution" },
    ],
  },
  {
    label: "Website",
    items: [{ label: "Settings", icon: SettingsIcon, path: "/settings" }],
  },
]

export const SETTINGS_NAV: NavItem[] = [
  { label: "Profile", icon: UserIcon, to: "/settings/profile" },
  {
    label: "Preferences",
    icon: SlidersHorizontalIcon,
    to: "/settings/preferences",
  },
  { label: "Security", icon: ShieldIcon, to: "/settings/security" },
  { label: "API keys", icon: KeyRoundIcon, to: "/settings/api-keys" },
  { label: "Websites", icon: GlobeIcon, to: "/settings/websites" },
  { label: "Teams", icon: UsersIcon, to: "/settings/teams" },
]

export const ADMIN_NAV: NavItem[] = [
  { label: "Users", icon: UsersIcon, to: "/admin/users", admin: true },
  { label: "Teams", icon: BoxesIcon, to: "/admin/teams", admin: true },
  { label: "Websites", icon: GlobeIcon, to: "/admin/websites", admin: true },
  { label: "Security", icon: ShieldIcon, to: "/admin/security", admin: true },
]

export const FOOTER_NAV: NavItem[] = [
  { label: "Settings", icon: SettingsIcon, to: "/settings/profile" },
  { label: "Admin", icon: CircleGaugeIcon, to: "/admin/users", admin: true },
]

export const REPORT_ICON = BarChart3Icon
