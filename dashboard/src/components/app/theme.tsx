import { MoonIcon, SunIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "umami-theme"

/** Runs before paint so the page never flashes the wrong theme. Dark is the default. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
