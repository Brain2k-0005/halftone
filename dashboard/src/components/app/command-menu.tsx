import { useNavigate } from "@tanstack/react-router"
import {
  ActivityIcon,
  GlobeIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoonIcon,
} from "lucide-react"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { setTheme } from "@/components/app/theme"
import type { Website } from "@/lib/api"

const CommandMenuContext = createContext<{ open: () => void }>({
  open: () => {},
})

export function useCommandMenu() {
  return useContext(CommandMenuContext)
}

export function CommandMenuProvider({
  websites,
  onLogout,
  children,
}: {
  websites: Website[]
  onLogout: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const toggleTheme = () =>
    setTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark"
    )

  return (
    <CommandMenuContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search websites and pages…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => run(() => navigate({ to: "/" }))}>
                <LayoutGridIcon /> Overview
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => navigate({ to: "/websites" }))}
              >
                <GlobeIcon /> Websites
              </CommandItem>
            </CommandGroup>
            {websites.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Websites">
                  {websites.map((w) => (
                    <CommandItem
                      key={w.id}
                      value={`${w.name} ${w.domain}`}
                      onSelect={() =>
                        run(() =>
                          navigate({
                            to: "/websites/$websiteId",
                            params: { websiteId: w.id },
                          })
                        )
                      }
                    >
                      <GlobeIcon />
                      <span>{w.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {w.domain}
                      </span>
                    </CommandItem>
                  ))}
                  {websites.map((w) => (
                    <CommandItem
                      key={`${w.id}-rt`}
                      value={`${w.name} realtime live`}
                      onSelect={() =>
                        run(() =>
                          navigate({
                            to: "/websites/$websiteId/realtime",
                            params: { websiteId: w.id },
                          })
                        )
                      }
                    >
                      <ActivityIcon />
                      <span>{w.name} · Realtime</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup heading="General">
              <CommandItem onSelect={() => run(toggleTheme)}>
                <MoonIcon /> Toggle theme
              </CommandItem>
              <CommandItem onSelect={() => run(onLogout)}>
                <LogOutIcon /> Log out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </CommandMenuContext.Provider>
  )
}
