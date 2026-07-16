import { View, ScrollView, RefreshControl } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { trpc } from "@/lib/trpc"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState, useCallback } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"

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

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { data: asset, refetch } = trpc.fixedAssets.getAssetById.useQuery({ id: id! })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (!asset) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Text variant="bodySmall">Loading...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title={asset.name}
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
              <Text variant="h3">Asset Details</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Description" value={asset.description} />
              <DetailRow label="Asset Class" value={asset.assetClass} />
              <DetailRow label="Location" value={asset.location} />
              <DetailRow label="Acquisition Date" value={asset.acquisitionDate ? formatDate(asset.acquisitionDate) : null} />
              <DetailRow label="Status" value={asset.status} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Valuation</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Cost" value={formatCurrency(asset.cost)} />
              <DetailRow label="Salvage Value" value={formatCurrency(asset.salvageValue)} />
              <DetailRow label="Useful Life" value={asset.usefulLife ? `${asset.usefulLife} years` : null} />
              <DetailRow label="Depreciation Method" value={asset.depreciationMethod} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Depreciation</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Accumulated Depreciation" value={formatCurrency(asset.accumulatedDepreciation)} />
              <DetailRow label="Net Book Value" value={formatCurrency(asset.netBookValue)} />
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}
