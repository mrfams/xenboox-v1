import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function CreateSupplierScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const utils = trpc.useUtils()

  const mutation = trpc.ap.createSupplier.useMutation({
    onSuccess: () => {
      utils.ap.listSuppliers.invalidate()
      Alert.alert("Success", "Supplier created", [{ text: "OK", onPress: () => router.back() }])
    },
    onError: (err: unknown) => Alert.alert("Error", err instanceof Error ? err.message : "Unknown error"),
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="New Supplier"
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
                <Text variant="h3">Supplier Details</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Name *" value={name} onChangeText={setName} placeholder="Supplier name" />
                  <Input label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" />
                  <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+220 XXXX-XXXX" keyboardType="phone-pad" />
                  <View>
                    <Text variant="caption" className="mb-1">Payment Terms</Text>
                    <View className="flex-row gap-2">
                      {["Net 15", "Net 30", "Net 60", "Due on Receipt"].map((term) => (
                        <Button
                          key={term}
                          variant={paymentTerms === term ? "primary" : "outline"}
                          size="sm"
                          onPress={() => setPaymentTerms(term)}
                        >
                          {term}
                        </Button>
                      ))}
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            <Button
              onPress={() => mutation.mutate({ name, contactEmail: email || undefined, contactPhone: phone || undefined, paymentTerms })}
              disabled={!name || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Supplier"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}