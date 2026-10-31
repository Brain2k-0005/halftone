/*
 * Board data model (same JSON the original Umami stores in `board.parameters`):
 *
 *   parameters: { websiteId? | pixelId? | linkId?, rows: [{ id, size?, columns: [{ id, size?, component? }] }] }
 *   component:  { type, entityType?, entityId?, websiteId? (legacy), title?, description?, props? }
 *
 * Board types: `mixed` (any website/pixel/link per widget), `website`, `pixel`, `link` (bound to one entity),
 * plus the legacy `dashboard` / `open`.
 */

export type EntityType = "website" | "pixel" | "link"
export type BoardType = "mixed" | "website" | "pixel" | "link"

export interface BoardComponent {
  type: string
  entityType?: EntityType
  entityId?: string
  websiteId?: string
  title?: string
  description?: string
  props?: Record<string, unknown>
}

export interface BoardColumn {
  id: string
  size?: number
  component?: BoardComponent | null
}

export interface BoardRow {
  id: string
  size?: number
  columns: BoardColumn[]
}

export interface BoardParameters {
  websiteId?: string
  pixelId?: string
  linkId?: string
  rows?: BoardRow[]
  [key: string]: unknown
}

export interface Board {
  id: string
  name: string
  description: string
  type: string
  teamId?: string | null
  userId?: string | null
  parameters: BoardParameters
  createdAt: string
}

export const MAX_COLUMNS = 4

export const ENTITY_LABELS: Record<EntityType, string> = {
  website: "Website",
  pixel: "Pixel",
  link: "Link",
}

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  mixed: "Open",
  website: "Website",
  pixel: "Pixel",
  link: "Link",
}

export function getBoardType(
  board: Pick<Board, "type" | "parameters">
): BoardType {
  const { type, parameters } = board
  if (
    type === "website" ||
    type === "pixel" ||
    type === "link" ||
    type === "mixed"
  )
    return type
  // Legacy `dashboard` / `open` boards: derive the type from the bound entity.
  if (parameters?.pixelId) return "pixel"
  if (parameters?.linkId) return "link"
  if (parameters?.websiteId) return "website"
  return "mixed"
}

export function getBoardEntity(board: Pick<Board, "type" | "parameters">): {
  entityType?: EntityType
  entityId?: string
} {
  const type = getBoardType(board)
  const p = board.parameters ?? {}
  if (type === "website")
    return { entityType: "website", entityId: p.websiteId }
  if (type === "pixel") return { entityType: "pixel", entityId: p.pixelId }
  if (type === "link") return { entityType: "link", entityId: p.linkId }
  return {}
}

export function getComponentEntity(c?: BoardComponent | null): {
  entityType?: EntityType
  entityId?: string
} {
  if (c?.entityType && c.entityId)
    return { entityType: c.entityType, entityId: c.entityId }
  if (c?.websiteId) return { entityType: "website", entityId: c.websiteId }
  return {}
}

/** The entity a widget reads from: the board's own entity if it has one, else the widget's. */
export function resolveEntity(
  board: Pick<Board, "type" | "parameters">,
  c?: BoardComponent | null
) {
  const own = getBoardEntity(board)
  return own.entityId ? own : getComponentEntity(c)
}

/** Parameters of a board bound to `entityId`: replaces any previous binding, keeps the layout. */
export function setBoardEntity(
  parameters: BoardParameters = {},
  type: BoardType,
  entityId?: string
): BoardParameters {
  const { websiteId: _w, pixelId: _p, linkId: _l, ...rest } = parameters
  if (type === "website" && entityId) return { ...rest, websiteId: entityId }
  if (type === "pixel" && entityId) return { ...rest, pixelId: entityId }
  if (type === "link" && entityId) return { ...rest, linkId: entityId }
  return rest
}

export const uid = () => crypto.randomUUID()

export function emptyRow(): BoardRow {
  return { id: uid(), columns: [{ id: uid(), component: null }] }
}
