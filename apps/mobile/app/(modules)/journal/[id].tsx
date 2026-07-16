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

function LineRow({ account, debit, credit }: { account: string; debit: string; credit: string }) {
  const hasDebit = parseFloat(debit || "0") > 0
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <View className="flex-1">
        <Text variant="bodySmall" className="font-medium">{account}</Text>
      </View>
      <View className="items-end">
        <Text variant="bodySmall" className={hasDebit ? "font-medium" : "text-slate-500"}>
          {hasDebit ? formatCurrency(parseFloat(debit)) : ""}
        </Text>
        {!hasDebit && parseFloat(credit || "0") > 0 && (
          <Text variant="bodySmall" className="text-primary-600">
            ({formatCurrency(parseFloat(credit))})
          </Text>
        )}
      </View>
    </View>
  )
}

export default function JournalEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { data: entry, refetch } = trpc.journal.getById.useQuery({ id: id! })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Text variant="bodySmall">Loading...</Text>
      </View>
    )
  }

  const totalDebit = entry.lines?.reduce(
    (sum: number, l: any) => sum + parseFloat(l.debit || "0"),
    0
  ) || 0
  const totalCredit = entry.lines?.reduce(
    (sum: number, l: any) => sum + parseFloat(l.credit || "0"),
    0
  ) || 0

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title={`JE-${entry.entryNumber}`}
        subtitle={entry.description}
        leftAction={
          <Text variant="body" className="text-primary-600" onPress={() => router.back()}>
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
              <Text variant="h3">Entry Details</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Entry Number" value={entry.entryNumber} />
              <DetailRow label="Date" value={entry.date} />
              <DetailRow label="Status" value={entry.status} />
              <DetailRow label="Posted By" value={entry.postedBy} />
              <DetailRow label="Source" value={entry.source} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Lines</Text>
            </CardHeader>
            <CardContent>
              {entry.lines?.map((line: any) => (
                <LineRow
                  key={line.id}
                  account={line.accountId}
                  debit={line.debit}
                  credit={line.credit}
                />
              ))}

              <View className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <View className="flex-row justify-between">
                  <Text variant="bodySmall" className="font-medium">Total Debit</Text>
                  <Text variant="bodySmall" className="font-medium">
                    {formatCurrency(totalDebit)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text variant="bodySmall" className="font-medium">Total Credit</Text>
                  <Text variant="bodySmall" className="font-medium">
                    {formatCurrency(totalCredit)}
                  </Text>
                </View>
                <View className="mt-2 flex-row justify-between">
                  <Text variant="bodySmall" className="font-medium">Balanced</Text>
                  <Text
                    variant="bodySmall"
                    className={Math.abs(totalDebit - totalCredit) < 0.01 ? "text-success font-medium" : "text-danger font-medium"}
                  >
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? "Yes" : "No"}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}