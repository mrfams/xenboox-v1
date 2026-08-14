import { View, FlatList, RefreshControl, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { ErrorComponent } from "@/components/error-component";
import { ScreenSkeleton } from "@/components/ui/skeleton";

type Customer = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string;
  creditLimit: string | null;
  isActive: boolean;
};

export default function ARScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const {
    data: customers,
    refetch,
    isLoading,
    error,
  } = trpc.ar.listCustomers.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return <ScreenSkeleton rows={6} />;
  }

  if (error) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Header title="Accounts Receivable" />
        <ErrorComponent message={error.message} onRetry={refetch} />
      </View>
    );
  }

  const filtered = (customers || []).filter((c: Customer) => {
    const term = search.toLowerCase();
    return !term || c.name.toLowerCase().includes(term);
  });

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Accounts Receivable"
        subtitle="Customers"
        rightAction={
          <Pressable onPress={() => router.push("/(modules)/ar/create")}>
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <View className="px-4 pt-2">
        <Input
          placeholder="Search customers..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(modules)/ar/${item.id}`)}>
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
                      className={
                        item.isActive ? "text-success" : "text-slate-500"
                      }
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
              No customers
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No customers found.
            </Text>
          </View>
        }
      />
    </View>
  );
}
