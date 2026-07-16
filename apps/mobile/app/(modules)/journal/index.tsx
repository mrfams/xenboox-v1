import { View, FlatList, RefreshControl, Pressable } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc"
import { useState, useCallback } from "react"
import { useRouter } from "expo-router"
import { Plus } from "lucide-react-native"

type JournalEntry = {
  id: string
  entryNumber: string
  description: string
  entryDate: string
  status: string
  totalDebit: string
  totalCredit: string
}

export default function JournalScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()
  const { data: entries, refetch } = trpc.journal.list.useQuery()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const filtered = (entries || []).filter((e: JournalEntry) => {
    const term = search.toLowerCase()
    return (
      !term ||
      e.entryNumber.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term)
    )
  })

  const statusColors: Record<string, string> = {
    draft: "text-slate-500",
    posted: "text-success",
    voided: "text-danger",
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Journal"
        subtitle="Entries"
        rightAction={
          <Pressable onPress={() => router.push("/(modules)/journal/create")}>
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <View className="px-4 pt-2">
        <Input
          placeholder="Search entries..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(modules)/journal/${item.id}`)}>
            <Card variant="elevated" className="mx-4 mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">
                      {item.entryNumber}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="bodySmall">{item.entryDate}</Text>
                    <Text
                      variant="caption"
                      className={statusColors[item.status] || ""}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
              No journal entries
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No journal entries found.
            </Text>
          </View>
        }
      />
    </View>
  )
}
