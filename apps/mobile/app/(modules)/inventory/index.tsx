import { View, FlatList, RefreshControl, Pressable } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { trpc } from "@/lib/trpc"
import { useState, useCallback } from "react"
import { useRouter } from "expo-router"
import { formatCurrency } from "@/lib/utils"
import { Plus } from "lucide-react-native"

type InventoryItem = {
  id: string
  name: string
  sku: string
  category: string
  qtyOnHand: number
  reorderLevel: number
  standardCost: number
}

export default function InventoryScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { data: items, refetch } = trpc.inventory.listItems.useQuery()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Inventory"
        subtitle="Stock Items"
        rightAction={
          <Pressable onPress={() => router.push("/(modules)/inventory/create")}>
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <FlatList
        data={items || []}
        renderItem={({ item }) => {
          const isLow = item.qtyOnHand < item.reorderLevel
          return (
            <Pressable onPress={() => router.push(`/(modules)/inventory/${item.id}`)}>
              <Card variant="elevated" className="mx-4 mb-3">
                <CardContent>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text variant="body" className="font-medium">
                        {item.name}
                      </Text>
                      <Text variant="caption">
                        {item.sku} · {item.category}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text variant="bodySmall" className="font-medium">
                        {formatCurrency(item.standardCost)}
                      </Text>
                      <Text
                        variant="bodySmall"
                        className={isLow ? "text-danger font-medium" : "text-success"}
                      >
                        Qty: {item.qtyOnHand}
                        {isLow ? " ⚠" : ""}
                      </Text>
                      <Text variant="caption" className="text-slate-500">
                        Reorder: {item.reorderLevel}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          )
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <Text variant="h3" className="mb-2">
              No items
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No inventory items have been recorded yet.
            </Text>
          </View>
        }
      />
    </View>
  )
}
