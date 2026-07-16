import { View, TouchableOpacity, Text, Alert } from "react-native"
import * as SecureStore from "expo-secure-store"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc"

type Entity = {
  id: string
  name: string
  role: string
}

export function EntitySwitcher() {
  const router = useRouter()
  const [currentId, setCurrentId] = useState<string | null>(null)
  const { data: entities } = trpc.organization.listUserEntities.useQuery()

  useEffect(() => {
    SecureStore.getItemAsync("xenboox_entity_id").then(setCurrentId)
  }, [])

  if (!entities || entities.length <= 1) return null

  async function switchEntity(entity: Entity) {
    await SecureStore.setItemAsync("xenboox_entity_id", entity.id)
    setCurrentId(entity.id)
    router.replace("/(tabs)")
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-slate-500">Switch Entity</Text>
      {entities.map((entity: Entity) => (
        <TouchableOpacity
          key={entity.id}
          onPress={() => switchEntity(entity)}
          className={`flex-row items-center rounded-lg border p-3 ${
            entity.id === currentId
              ? "border-primary-500 bg-primary-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-100">
            <Text className="text-sm font-bold text-primary-600">
              {entity.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-medium text-slate-900">
              {entity.name}
            </Text>
            <Text className="text-xs text-slate-500">
              {entity.role}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}