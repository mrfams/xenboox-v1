import { useEffect, useState } from "react"
import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { useNetInfo } from "@react-native-community/netinfo"

export function OfflineIndicator() {
  const netInfo = useNetInfo()
  const isOnline = netInfo.isConnected !== false

  if (isOnline) return null

  return (
    <View className="absolute bottom-20 left-4 right-4 z-50 rounded-lg bg-yellow-500 px-4 py-3 shadow-lg">
      <Text variant="bodySmall" className="text-center font-medium text-white">
        You're offline. Changes will sync when reconnected.
      </Text>
    </View>
  )
}