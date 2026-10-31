import { createServerFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"
import { readBranding, writeBranding } from "@/server/branding"
import { umami, UMAMI_PUBLIC_URL } from "@/server/umami"
import {
  APPEARANCE_KEY,
  sanitizeAppearance,
  type Branding,
} from "@/lib/branding"

/** Public: the login page and share pages need the brand too. Also returns the user's own appearance cookie. */
export const getBrandingFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const branding = await readBranding()
    const raw = getCookie(APPEARANCE_KEY)
    let user = null
    if (raw) {
      try {
        user = sanitizeAppearance(JSON.parse(raw), branding.appearance)
      } catch {
        user = null
      }
    }
    return { branding, user, publicUrl: UMAMI_PUBLIC_URL }
  }
)

/** Admins only (checked against Umami, not trusted from the client). */
export const saveBrandingFn = createServerFn({ method: "POST" })
  .validator((d: Branding) => d)
  .handler(async ({ data }) => {
    const me = await umami<{ user: { isAdmin: boolean } }>("/me").catch(
      () => null
    )
    if (!me?.user.isAdmin)
      throw new Error("Only administrators can change the branding.")
    try {
      return await writeBranding(data)
    } catch {
      throw new Error(
        "Branding could not be saved on this server (read-only filesystem?). Use the BRAND_* environment variables instead."
      )
    }
  })
