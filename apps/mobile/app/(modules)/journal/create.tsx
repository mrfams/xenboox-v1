import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function CreateJournalEntryScreen() {
  const router = useRouter()
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [debitAccount, setDebitAccount] = useState("")
  const [creditAccount, setCreditAccount] = useState("")
  const [amount, setAmount] = useState("")
  const utils = trpc.useUtils()

  const mutation = trpc.journal.create.useMutation({
    onSuccess: () => {
      utils.journal.list.invalidate()
      Alert.alert("Success", "Journal entry created", [{ text: "OK", onPress: () => router.back() }])
    },
    onError: (err: unknown) => Alert.alert("Error", err instanceof Error ? err.message : "Unknown error"),
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="New Journal Entry"
        leftAction={
          <Text variant="body" className="text-primary-600" onPress={() => router.back()}>
            Cancel
          </Text>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <View className="gap-4">
            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Entry Details</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Description *" value={description} onChangeText={setDescription} placeholder="Entry description" />
                  <Input label="Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
                </View>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Line Items</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <View className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <Text variant="caption" className="mb-2 font-medium">DEBIT</Text>
                    <Input label="Account ID *" value={debitAccount} onChangeText={setDebitAccount} placeholder="Account UUID" />
                  </View>
                  <View className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <Text variant="caption" className="mb-2 font-medium">CREDIT</Text>
                    <Input label="Account ID *" value={creditAccount} onChangeText={setCreditAccount} placeholder="Account UUID" />
                  </View>
                  <Input label="Amount *" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
                </View>
              </CardContent>
            </Card>

            <Button
              onPress={() => {
                if (!description || !date || !debitAccount || !creditAccount || !amount) {
                  Alert.alert("Error", "All fields are required")
                  return
                }
                mutation.mutate({
                  description,
                  date,
                  periodId: "00000000-0000-0000-0000-000000000013",
                  lines: [
                    { accountId: debitAccount, debit: amount, credit: "0" },
                    { accountId: creditAccount, debit: "0", credit: amount },
                  ],
                })
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Entry"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}