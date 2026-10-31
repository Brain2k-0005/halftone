/** The selected workspace (personal or a team) lives in a cookie so server loaders see it too. */
export const TEAM_COOKIE = "umami_team"

export function setTeamCookie(teamId: string | null) {
  document.cookie = teamId
    ? `${TEAM_COOKIE}=${encodeURIComponent(teamId)}; path=/; max-age=31536000; samesite=lax`
    : `${TEAM_COOKIE}=; path=/; max-age=0; samesite=lax`
}
