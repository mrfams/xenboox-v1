import { View, ScrollView, RefreshControl } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { ErrorComponent } from "@/components/error-component";
import { ScreenSkeleton } from "@/components/ui/skeleton";

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <Card variant="elevated">
      <CardContent>
        <Text variant="caption" className="mb-1">
          {title}
        </Text>
        <Text variant="h2" className={color || ""}>
          {value}
        </Text>
        {subtitle && <Text variant="caption">{subtitle}</Text>}
      </CardContent>
    </Card>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: summary,
    refetch,
    isLoading,
    error,
  } = trpc.organization.getEntitySummary.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return <ScreenSkeleton rows={5} />;
  }

  if (error) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Header title="Dashboard" />
        <ErrorComponent message={error.message} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header title="Dashboard" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text variant="h2" className="mb-4">
          Welcome back
        </Text>

        <View className="gap-3">
          <StatCard
            title="Cash Balance"
            value={summary?.cashBalance || "$0.00"}
            color="text-primary-600"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <StatCard
                title="AP Outstanding"
                value={summary?.apOutstanding || "$0.00"}
                color="text-danger"
              />
            </View>
            <View className="flex-1">
              <StatCard
                title="AR Outstanding"
                value={summary?.arOutstanding || "$0.00"}
                color="text-success"
              />
            </View>
          </View>

          <StatCard
            title="Current Period"
            value={summary?.currentPeriod || "No period"}
            subtitle={summary?.periodStatus || ""}
          />

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Quick Actions</Text>
            </CardHeader>
            <CardContent>
              <Text variant="bodySmall" className="text-slate-500">
                Chat with your AI CFO to get started. Ask questions about your
                finances, create journal entries, or run reports.
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
