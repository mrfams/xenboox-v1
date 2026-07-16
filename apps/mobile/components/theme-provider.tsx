import { createContext, useContext, useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { useColorScheme } from "react-native"

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
  const systemColorScheme = useColorScheme()
  const [theme, setThemeState] = useState<Theme>("system")

  useEffect(() => {
    SecureStore.getItemAsync("xenboox_theme").then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored)
      }
    })
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    SecureStore.setItemAsync("xenboox_theme", t)
  }

  const resolved = theme === "system"
    ? (systemColorScheme === "dark" ? "dark" : "light")
    : theme

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}