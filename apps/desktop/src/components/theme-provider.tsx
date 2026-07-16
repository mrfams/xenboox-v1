import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: "light" | "dark"
}>({ theme: "system", setTheme: () => {}, resolved: "light" })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("xenboox_theme") as Theme) || "system"
  })

  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    localStorage.setItem("xenboox_theme", theme)

    function getSystemTheme(): "light" | "dark" {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }

    function applyTheme() {
      const resolvedTheme = theme === "system" ? getSystemTheme() : theme
      setResolved(resolvedTheme)
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    }

    applyTheme()

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => { if (theme === "system") applyTheme() }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}