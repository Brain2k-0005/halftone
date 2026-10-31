import {
  CompassIcon,
  FileTextIcon,
  LogInIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorIcon,
  MousePointerClickIcon,
  ShareIcon,
} from "lucide-react"
import { countryName, flag } from "@/components/app/top-list"
import { Cap, DEVICE_ICONS, type MetricTab } from "@/components/traffic/shared"

export const PAGE_TABS: MetricTab[] = [
  {
    value: "path",
    label: "Path",
    filter: "path",
    icon: () => <FileTextIcon />,
  },
  { value: "entry", label: "Entry", filter: "path", icon: () => <LogInIcon /> },
  { value: "exit", label: "Exit", filter: "path", icon: () => <LogOutIcon /> },
]

export const SOURCE_TABS: MetricTab[] = [
  {
    value: "referrer",
    label: "Referrers",
    filter: "referrer",
    icon: () => <ShareIcon />,
    rowLabel: (r) => r.x || "Direct / none",
  },
  {
    value: "channel",
    label: "Channels",
    icon: () => <CompassIcon />,
    rowLabel: (r) => <Cap>{r.x || "direct"}</Cap>,
  },
]

export const LOCATION_TABS: MetricTab[] = [
  {
    value: "country",
    label: "Countries",
    filter: "country",
    icon: (r) => flag(r.x),
    rowLabel: (r) => countryName(r.x),
  },
  {
    value: "city",
    label: "Cities",
    filter: "city",
    icon: () => <MapPinIcon />,
  },
]

export const ENV_TABS: MetricTab[] = [
  {
    value: "browser",
    label: "Browser",
    filter: "browser",
    icon: () => <CompassIcon />,
    rowLabel: (r) => <Cap>{r.x}</Cap>,
  },
  { value: "os", label: "OS", filter: "os", icon: () => <MonitorIcon /> },
  {
    value: "device",
    label: "Device",
    filter: "device",
    icon: (r) => {
      const Icon = DEVICE_ICONS[r.x] ?? MonitorIcon
      return <Icon />
    },
    rowLabel: (r) => <Cap>{r.x}</Cap>,
  },
]

export const EVENT_TABS: MetricTab[] = [
  {
    value: "event",
    label: "Events",
    filter: "event",
    icon: () => <MousePointerClickIcon />,
  },
]
