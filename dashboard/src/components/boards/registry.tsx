import {
  ActivityIcon,
  CalendarIcon,
  ChartColumnBigIcon,
  ChartPieIcon,
  FileTextIcon,
  GlobeIcon,
  PanelTopIcon,
  SheetIcon,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  ActiveBlock,
  ChartBlock,
  EventsChartBlock,
  EventStatsBlock,
  MetricsBlock,
  StatsBlock,
  WeeklyBlock,
} from "./blocks"
import type { EntityType } from "./model"

/*
 * Widget types a board can contain. The keys match the original Umami so existing boards keep working;
 * widgets that need data this dashboard doesn't have yet (goals, funnels, revenue, realtime charts) are
 * rendered as a placeholder and are not offered in the picker.
 */

export interface ConfigField {
  name: string
  label: string
  type: "select" | "textarea"
  options?: { label: string; value: string }[]
  optionsByEntity?: Partial<
    Record<EntityType, { label: string; value: string }[]>
  >
  defaultValue?: string
}

export interface WidgetDefinition {
  type: string
  name: string
  description: string
  category: string
  icon: LucideIcon
  /** Entity types the widget works with (default: all). */
  supports?: EntityType[]
  /** Text blocks don't read from an entity. */
  requiresEntity?: boolean
  defaultProps?: Record<string, unknown>
  fields?: ConfigField[]
  /** Bare content: the board card around it provides title and chrome. */
  render: (ctx: {
    id: string
    entityType?: EntityType
    props: Record<string, unknown>
  }) => ReactNode
}

export const CATEGORIES = [
  { key: "overview", name: "Overview" },
  { key: "tables", name: "Tables" },
  { key: "visualization", name: "Visualization" },
  { key: "content", name: "Content" },
]

const METRIC_TYPES = [
  { label: "Path", value: "path" },
  { label: "Entry page", value: "entry" },
  { label: "Exit page", value: "exit" },
  { label: "Title", value: "title" },
  { label: "Query", value: "query" },
  { label: "Referrer", value: "referrer" },
  { label: "Channel", value: "channel" },
  { label: "Country", value: "country" },
  { label: "Region", value: "region" },
  { label: "City", value: "city" },
  { label: "Browser", value: "browser" },
  { label: "OS", value: "os" },
  { label: "Device", value: "device" },
  { label: "Language", value: "language" },
  { label: "Screen", value: "screen" },
  { label: "UTM source", value: "utmSource" },
  { label: "UTM medium", value: "utmMedium" },
  { label: "UTM campaign", value: "utmCampaign" },
  { label: "UTM content", value: "utmContent" },
  { label: "UTM term", value: "utmTerm" },
  { label: "Event", value: "event" },
  { label: "Hostname", value: "hostname" },
]

const SHARED_METRIC_TYPES = METRIC_TYPES.filter((m) =>
  [
    "referrer",
    "channel",
    "browser",
    "os",
    "device",
    "country",
    "region",
    "city",
  ].includes(m.value)
)

const LIMITS = ["5", "10", "20"].map((v) => ({ label: v, value: v }))

const UTM_PARAMS = [
  { label: "Source", value: "utmSource" },
  { label: "Medium", value: "utmMedium" },
  { label: "Campaign", value: "utmCampaign" },
  { label: "Content", value: "utmContent" },
  { label: "Term", value: "utmTerm" },
]

/** Legacy boards stored UTM params as `utm_source`. */
const utmType = (param: unknown) =>
  String(param ?? "utmSource").replace(/_(\w)/g, (_, c: string) =>
    c.toUpperCase()
  )

const WIDGETS: WidgetDefinition[] = [
  {
    type: "WebsiteMetricsBar",
    name: "Metrics bar",
    description: "Visitors, visits, views, bounce rate and duration",
    category: "overview",
    icon: PanelTopIcon,
    render: ({ id, entityType }) => (
      <StatsBlock id={id} full={entityType === "website" || !entityType} />
    ),
  },
  {
    type: "EventsMetricsBar",
    name: "Event metrics bar",
    description: "Visitors, visits, events and unique events",
    category: "overview",
    icon: PanelTopIcon,
    supports: ["website"],
    render: ({ id }) => <EventStatsBlock id={id} />,
  },
  {
    type: "RealtimeActiveUsers",
    name: "Active users",
    description: "Visitors online right now",
    category: "overview",
    icon: ActivityIcon,
    supports: ["website"],
    render: ({ id }) => <ActiveBlock id={id} />,
  },
  {
    type: "WebsiteChart",
    name: "Visitors chart",
    description: "Page views and visitors over time",
    category: "visualization",
    icon: ChartColumnBigIcon,
    render: ({ id }) => <ChartBlock id={id} />,
  },
  {
    type: "EventsChart",
    name: "Events chart",
    description: "Custom events over time",
    category: "visualization",
    icon: ChartPieIcon,
    supports: ["website"],
    render: ({ id }) => <EventsChartBlock id={id} />,
  },
  {
    type: "WeeklyTraffic",
    name: "Weekly traffic",
    description: "Traffic heatmap by day and hour",
    category: "visualization",
    icon: CalendarIcon,
    supports: ["website"],
    render: ({ id }) => <WeeklyBlock id={id} />,
  },
  {
    type: "WorldMap",
    name: "Countries",
    description: "Geographic distribution of visitors",
    category: "visualization",
    icon: GlobeIcon,
    render: ({ id }) => <MetricsBlock id={id} type="country" limit={10} />,
  },
  {
    type: "UTM",
    name: "UTM",
    description: "Ranked list for one UTM parameter",
    category: "tables",
    icon: ChartPieIcon,
    supports: ["website"],
    defaultProps: { param: "utmSource", limit: "10" },
    fields: [
      {
        name: "param",
        label: "UTM param",
        type: "select",
        options: UTM_PARAMS,
        defaultValue: "utmSource",
      },
      {
        name: "limit",
        label: "Rows",
        type: "select",
        options: LIMITS,
        defaultValue: "10",
      },
    ],
    render: ({ id, props }) => (
      <MetricsBlock
        id={id}
        type={utmType(props.param)}
        limit={String(props.limit ?? 10)}
      />
    ),
  },
  {
    type: "MetricsTable",
    name: "Metrics table",
    description: "Ranked list of a dimension",
    category: "tables",
    icon: SheetIcon,
    defaultProps: { type: "path", limit: "10" },
    fields: [
      {
        name: "type",
        label: "Metric type",
        type: "select",
        options: METRIC_TYPES,
        optionsByEntity: {
          pixel: SHARED_METRIC_TYPES,
          link: SHARED_METRIC_TYPES,
        },
        defaultValue: "path",
      },
      {
        name: "limit",
        label: "Rows",
        type: "select",
        options: LIMITS,
        defaultValue: "10",
      },
    ],
    render: ({ id, props }) => (
      <MetricsBlock
        id={id}
        type={String(props.type ?? "path")}
        limit={String(props.limit ?? 10)}
      />
    ),
  },
  {
    type: "TextBlock",
    name: "Text",
    description: "Free-form text",
    category: "content",
    icon: FileTextIcon,
    requiresEntity: false,
    defaultProps: { text: "" },
    fields: [
      { name: "text", label: "Text", type: "textarea", defaultValue: "" },
    ],
    render: ({ props }) => (
      <p className="px-5 pb-5 text-[13px] break-words whitespace-pre-wrap">
        {String(props.text ?? "")}
      </p>
    ),
  },
]

const BY_TYPE = new Map(WIDGETS.map((w) => [w.type, w]))

export const widgets = () => WIDGETS
export const getWidget = (type: string) => BY_TYPE.get(type)

export function isSupported(widget: WidgetDefinition, entityType?: EntityType) {
  return !entityType || !widget.supports || widget.supports.includes(entityType)
}
