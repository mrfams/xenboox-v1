import { trpc } from "@/lib/trpc"
import { User, LogOut, Building2, Sun, Moon, Monitor } from "lucide-react"
import { clearAuth } from "@/lib/auth"
import { useTheme } from "@/components/theme-provider"
import { useState, useRef, useEffect } from "react"

export function Header() {
  const { data: user } = trpc.organization.getCurrentUser.useQuery()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleLogout() {
    await clearAuth()
    window.location.reload()
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{user.name || user.email}</span>
          </div>
        )}

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Settings"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-card shadow-md">
              <button
                onClick={() => { setTheme("light"); setMenuOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${theme === "light" ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                <Sun className="h-4 w-4" /> Light
              </button>
              <button
                onClick={() => { setTheme("dark"); setMenuOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${theme === "dark" ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                <Moon className="h-4 w-4" /> Dark
              </button>
              <button
                onClick={() => { setTheme("system"); setMenuOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${theme === "system" ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                <Monitor className="h-4 w-4" /> System
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}