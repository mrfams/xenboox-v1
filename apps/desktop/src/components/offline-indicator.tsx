import { WifiOff } from "lucide-react"
import { useNetworkStatus } from "@/hooks/use-network-status"

export function OfflineIndicator() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-yellow-600">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Changes will sync when reconnected.</span>
      </div>
    </div>
  )
}