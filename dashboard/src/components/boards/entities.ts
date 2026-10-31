import { useApi, type Paged } from "@/lib/api-client"
import type { EntityType } from "./model"

const BASE: Record<EntityType, string> = {
  website: "/websites",
  link: "/links",
  pixel: "/pixels",
}

export interface EntityOption {
  id: string
  name: string
}

/** All websites / links / pixels of a workspace (`teamId` null = personal), for pickers and name lookups. */
export function useEntityOptions(
  entityType: EntityType,
  teamId: string | null | undefined,
  enabled = true
) {
  const path =
    teamId === undefined
      ? null
      : teamId
        ? `/teams/${teamId}${BASE[entityType]}`
        : BASE[entityType]
  return useApi<Paged<EntityOption>>(
    path,
    { pageSize: 100 },
    { enabled, staleTime: 30_000 }
  )
}

/** id -> name for every entity type, so widgets can show which entity they read from. */
export function useEntityNames(teamId: string | null | undefined) {
  const websites = useEntityOptions("website", teamId)
  const links = useEntityOptions("link", teamId)
  const pixels = useEntityOptions("pixel", teamId)
  const names = new Map<string, string>()
  for (const list of [websites.data, links.data, pixels.data])
    for (const e of list?.data ?? []) names.set(e.id, e.name)
  return {
    names,
    isLoading: websites.isLoading || links.isLoading || pixels.isLoading,
  }
}
