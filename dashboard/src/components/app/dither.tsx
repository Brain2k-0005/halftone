import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/*
 * The dither texture of the ReUI templates, built the same way as in the Foto Waschbaer dashboard: a <canvas>
 * behind the content, colour = currentColor (text-muted-foreground), masked with
 * linear-gradient(to bottom, black, transparent 70%). It draws small squares on a 3 px grid (1.5 CSS px),
 * each with its own random, very low opacity (about 3 to 30 %, mostly below 8 %).
 * The parent needs the `dither` class.
 */
export function Dither({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const color = getComputedStyle(canvas).color
      const m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(color)
      const [r, g, b] = m
        ? [Number(m[1]), Number(m[2]), Number(m[3])]
        : [128, 128, 128]
      const step = 3 * dpr
      const dot = Math.ceil(1.5 * dpr)
      // Fixed seed: the pattern does not flicker on resize.
      let seed = 1234567
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 2 ** 32
      }
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const a = 0.035 + 0.27 * random() ** 3
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
          ctx.fillRect(x, y, dot, dot)
        }
      }
    }
    draw()
    const resize = new ResizeObserver(draw)
    resize.observe(canvas)
    // Theme switches (class on <html>) change the colour.
    const theme = new MutationObserver(draw)
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => {
      resize.disconnect()
      theme.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 h-full w-full rounded-[inherit] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] text-muted-foreground dark:opacity-60",
        className
      )}
    />
  )
}
