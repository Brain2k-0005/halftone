import {
  HeadContent,
  ScriptOnce,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router"
import { useAppearance, useBranding } from "@/components/app/brand"
import { themeScript } from "@/components/app/theme"
import { htmlAppearance } from "@/lib/branding"
import { getBrandingFn } from "@/lib/branding-fns"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  loader: () => getBrandingFn(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex,nofollow" },
      { title: loaderData?.branding.name ?? "Halftone" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: loaderData?.branding.logo || "/favicon.svg" },
    ],
  }),
  notFoundComponent: () => (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">This page could not be found.</h1>
    </main>
  ),
  errorComponent: ({ error, reset }) => (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {(error instanceof Error ? error.message : String(error)).slice(0, 300)}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
      >
        Try again
      </button>
    </main>
  ),
  shellComponent: RootDocument,
})

/** Page titles end in "· Halftone"; swap in the instance name when an admin renamed it. */
function useBrandedTitle() {
  const { name } = useBranding()
  const href = useRouterState({ select: (s) => s.location.href })
  useEffect(() => {
    if (name !== "Halftone" && document.title.endsWith("· Halftone"))
      document.title = document.title.replace(/· Halftone$/, `· ${name}`)
  }, [name, href])
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useBrandedTitle()
  const { appearance } = useAppearance()
  const { style, dither } = htmlAppearance(appearance)
  return (
    <html lang="en" suppressHydrationWarning style={style} data-dither={dither}>
      <head>
        <ScriptOnce>{themeScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  )
}

function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}
