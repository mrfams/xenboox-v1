import { View, ScrollView, RefreshControl } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { trpc } from "@/lib/trpc"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="mb-3 flex-row justify-between">
      <Text variant="caption">{label}</Text>
      <Text variant="bodySmall" className="font-medium">
        {value ?? "—"}
      </Text>
    </View>
  )
}

export default function InventoryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { data: item, refetch } = trpc.inventory.getItemById.useQuery({ id: id! })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Text variant="bodySmall">Loading...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title={item.name}
        leftAction={
          <Text variant="body" className="text-primary-600" onPress={() => router.back()}>
            ← Back
          </Text>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="gap-4">
          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Item Details</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="SKU" value={item.sku} />
              <DetailRow label="Category" value={item.category} />
              <DetailRow label="Unit" value={item.unit} />
              <DetailRow label="Cost Method" value={item.costMethod} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Stock & Pricing</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Standard Cost" value={formatCurrency(item.standardCost)} />
              <DetailRow label="Qty on Hand" value={item.qtyOnHand} />
              <DetailRow label="Reorder Level" value={item.reorderLevel} />
              <DetailRow label="Reorder Quantity" value={item.reorderQuantity} />
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}
