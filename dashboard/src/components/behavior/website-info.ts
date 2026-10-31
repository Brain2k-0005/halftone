import { useApi } from "@/lib/api-client"

export interface ReplayConfig {
  replayEnabled?: boolean
  heatmapEnabled?: boolean
  sampleRate?: number
  heatmapSampleRate?: number
  maskLevel?: "strict" | "moderate"
  maxDuration?: number
  blockSelector?: string
}

/** Full website record from `/websites/:id` (the shared `Website` type only has the list fields). */
export interface WebsiteInfo {
  id: string
  name: string
  domain: string
  userId: string | null
  teamId: string | null
  shareId: string | null
  recorderEnabled: boolean
  replayConfig: ReplayConfig | null
}

export function useWebsiteInfo(websiteId: string) {
  return useApi<WebsiteInfo>(`/websites/${websiteId}`)
}

/** Base URL of the Umami server that serves script.js / recorder.js. */
export const UMAMI_URL = (
  import.meta.env.VITE_UMAMI_URL ?? "http://localhost:3000"
).replace(/\/$/, "")
