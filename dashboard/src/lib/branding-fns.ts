import { createServerFn } from "@tanstack/react-start"
import { readBranding, writeBranding } from "@/server/branding"
import { umami } from "@/server/umami"
import type { Branding } from "@/lib/branding"

/** Public: the login page and share pages need the brand too. */
export const getBrandingFn = createServerFn({ method: "GET" }).handler(() =>
  readBranding()
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
