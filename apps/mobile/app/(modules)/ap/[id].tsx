import { View, ScrollView, RefreshControl } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { trpc } from "@/lib/trpc";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ErrorComponent } from "@/components/error-component";
import { ScreenSkeleton } from "@/components/ui/skeleton";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View className="mb-3 flex-row justify-between">
      <Text variant="caption">{label}</Text>
      <Text variant="bodySmall" className="font-medium">
        {value ?? "—"}
      </Text>
    </View>
  );
}

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: supplier,
    refetch,
    isLoading,
    error,
  } = trpc.ap.getSupplierById.useQuery({ id: id! });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return <ScreenSkeleton rows={3} />;
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        <Header title="Supplier" />
        <ErrorComponent message={error.message} onRetry={() => refetch()} />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Text variant="bodySmall">Supplier not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title={supplier.name}
        subtitle="Supplier"
        leftAction={
          <Text
            variant="body"
            className="text-primary-600"
            onPress={() => router.back()}
          >
            Back
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
              <Text variant="h3">Contact Details</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Email" value={supplier.contactEmail} />
              <DetailRow label="Phone" value={supplier.contactPhone} />
              <DetailRow label="Tax ID" value={supplier.taxId} />
              <DetailRow label="Address" value={supplier.address} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Payment Info</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Payment Terms" value={supplier.paymentTerms} />
              <DetailRow
                label="Status"
                value={supplier.isActive ? "Active" : "Inactive"}
              />
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
