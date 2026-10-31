import { useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Rendered inside the app shell when a page fails to load, so navigation stays usable. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const message = error instanceof Error ? error.message : String(error)

  const retry = async () => {
    reset()
    await router.invalidate()
  }

  return (
    <div className="bg-dither flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg border bg-background dark:bg-input/30">
        <TriangleAlertIcon className="size-5 text-destructive" />
      </span>
      <div>
        <h2 className="text-sm font-semibold">This page could not be loaded</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {message.length > 300 ? `${message.slice(0, 300)}…` : message}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={retry}>
        <RotateCwIcon /> Try again
      </Button>
    </div>
  )
}
