import { useEffect, useState } from "react"
import { Slot, useRouter, useSegments } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpc, createTRPCClient } from "@/lib/trpc"
import { getToken } from "@/lib/auth"
import { StatusBar } from "expo-status-bar"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { OfflineIndicator } from "@/components/offline-indicator"
import "../global.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1
    }
  }
})

const trpcClient = createTRPCClient()

function AuthGate() {
  const segments = useSegments()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = await getToken()
    const inAuthGroup = segments[0] === "(auth)"

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)")
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return null
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <StatusBar style="auto" />
            <AuthGate />
            <OfflineIndicator />
          </trpc.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}