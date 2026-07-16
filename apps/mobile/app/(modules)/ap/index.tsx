import { View, FlatList, RefreshControl, Pressable } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useState, useCallback } from "react"
import { useRouter } from "expo-router"
import { Plus } from "lucide-react-native"

type Supplier = {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  paymentTerms: string
  isActive: boolean
}

export default function APScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()
  const { data: suppliers, refetch } = trpc.ap.listSuppliers.useQuery()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const filtered = (suppliers || []).filter((s: Supplier) => {
    const term = search.toLowerCase()
    return !term || s.name.toLowerCase().includes(term)
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Accounts Payable"
        subtitle="Suppliers"
        rightAction={
          <Pressable onPress={() => router.push("/(modules)/ap/create")}>
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <View className="px-4 pt-2">
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(modules)/ap/${item.id}`)}>
            <Card variant="elevated" className="mx-4 mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">
                      {item.name}
                    </Text>
                    <Text variant="caption">
                      {item.contactEmail || "No email"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="bodySmall">{item.paymentTerms}</Text>
                    <Text
                      variant="caption"
                      className={item.isActive ? "text-success" : "text-slate-500"}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <Text variant="h3" className="mb-2">
              No suppliers
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No suppliers found.
            </Text>
          </View>
        }
      />
    </View>
  )
}
