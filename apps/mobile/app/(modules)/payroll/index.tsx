import { View, FlatList, RefreshControl, Pressable } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc"
import { useState, useCallback } from "react"
import { useRouter } from "expo-router"
import { Plus } from "lucide-react-native"
import { ErrorComponent } from "@/components/error-component"

type Employee = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  department: string
  jobTitle: string
  status: string
}

export default function PayrollScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const { data: employees, refetch, isLoading, error } = trpc.payroll.listEmployees.useQuery()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Header title="Payroll" />
        <ErrorComponent message={error.message} onRetry={refetch} />
      </View>
    )
  }

  const filtered = (employees || []).filter((e: Employee) => {
    const term = search.toLowerCase()
    return (
      !term ||
      e.firstName.toLowerCase().includes(term) ||
      e.lastName.toLowerCase().includes(term) ||
      e.employeeNumber.toLowerCase().includes(term) ||
      e.department.toLowerCase().includes(term) ||
      e.jobTitle.toLowerCase().includes(term)
    )
  })

  const statusColors: Record<string, string> = {
    active: "text-success",
    inactive: "text-slate-500",
    terminated: "text-danger"
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Payroll"
        subtitle="Employees"
        rightAction={
          <Pressable onPress={() => router.push("/(modules)/payroll/create")}>
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <View className="px-4 pt-2">
        <Input
          placeholder="Search employees..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(modules)/payroll/${item.id}`)}>
            <Card variant="elevated" className="mx-4 mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text variant="caption">
                      {item.employeeNumber} · {item.department}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="bodySmall">{item.jobTitle}</Text>
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
              No employees
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No employees found matching your search.
            </Text>
          </View>
        }
      />
    </View>
  )
}
