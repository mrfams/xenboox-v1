import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpc, createTRPCClient } from "./lib/trpc"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/error-boundary"
import { OfflineIndicator } from "./components/offline-indicator"
import { checkForUpdates, setupAutoUpdate } from "./lib/auto-update"
import App from "./App"
import "./styles/globals.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1
    }
  }
})

const trpcClient = createTRPCClient()

function UpdateChecker() {
  React.useEffect(() => {
    checkForUpdates()
    setupAutoUpdate()
  }, [])

  return null
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
              <OfflineIndicator />
              <UpdateChecker />
            </BrowserRouter>
          </QueryClientProvider>
        </trpc.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)