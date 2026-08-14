import { View, FlatList, RefreshControl, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react-native";
import { ErrorComponent } from "@/components/error-component";
import { ScreenSkeleton } from "@/components/ui/skeleton";

type Asset = {
  id: string;
  name: string;
  assetClass: string;
  cost: number;
  netBookValue: number;
  status: string;
};

export default function FixedAssetsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: assets,
    refetch,
    isLoading,
    error,
  } = trpc.fixedAssets.listAssets.useQuery();

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
        <Header title="Fixed Assets" />
        <ErrorComponent message={error.message} onRetry={refetch} />
      </View>
    );
  }

  const statusColors: Record<string, string> = {
    active: "text-success",
    disposed: "text-slate-500",
    impaired: "text-danger",
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="Fixed Assets"
        subtitle="Asset Register"
        rightAction={
          <Pressable
            onPress={() => router.push("/(modules)/fixed-assets/create")}
          >
            <Plus size={24} color="#2563eb" />
          </Pressable>
        }
      />

      <FlatList
        data={assets || []}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(modules)/fixed-assets/${item.id}`)}
          >
            <Card variant="elevated" className="mx-4 mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">
                      {item.name}
                    </Text>
                    <Text variant="caption">{item.assetClass}</Text>
                  </View>
                  <View className="items-end">
                    <Text variant="bodySmall" className="font-medium">
                      {formatCurrency(item.cost)}
                    </Text>
                    <Text variant="caption">
                      NBV: {formatCurrency(item.netBookValue)}
                    </Text>
                    <Text
                      variant="caption"
                      className={statusColors[item.status] || ""}
                    >
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
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
              No assets
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              No fixed assets have been recorded yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}
