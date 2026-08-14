import { View, FlatList, RefreshControl } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { ErrorComponent } from "@/components/error-component";
import { ScreenSkeleton } from "@/components/ui/skeleton";

type Invoice = {
  id: string;
  invoiceNumber: string;
  contactName: string;
  totalAmount: number;
  status: string;
  dueDate: string;
};

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusColors: Record<string, string> = {
    draft: "text-slate-500",
    sent: "text-primary-600",
    paid: "text-success",
    overdue: "text-danger",
  };

  return (
    <Card variant="elevated" className="mb-3">
      <CardContent>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="bodySmall" className="font-medium">
              {invoice.invoiceNumber}
            </Text>
            <Text variant="caption">{invoice.contactName}</Text>
          </View>
          <View className="items-end">
            <Text variant="bodySmall" className="font-medium">
              ${invoice.totalAmount.toFixed(2)}
            </Text>
            <Text
              variant="caption"
              className={statusColors[invoice.status] || ""}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

export default function InvoicesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: invoices,
    refetch,
    isLoading,
    error,
  } = trpc.ar.listInvoices.useQuery();

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
        <Header title="Invoices" />
        <ErrorComponent message={error.message} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header title="Invoices" />

      <FlatList
        data={invoices || []}
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <Text variant="h3" className="mb-2">
              No invoices
            </Text>
            <Text variant="bodySmall" className="text-center text-slate-500">
              Create your first invoice to get started.
            </Text>
          </View>
        }
      />
    </View>
  );
}
