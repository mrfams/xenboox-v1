import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function CreateInventoryItemScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [category, setCategory] = useState("general")
  const [unit, setUnit] = useState("unit")
  const [cost, setCost] = useState("")
  const [reorderLevel, setReorderLevel] = useState("0")
  const utils = trpc.useUtils()

  const mutation = trpc.inventory.createItem.useMutation({
    onSuccess: () => {
      utils.inventory.listItems.invalidate()
      Alert.alert("Success", "Item created", [{ text: "OK", onPress: () => router.back() }])
    },
    onError: (err: unknown) => Alert.alert("Error", err instanceof Error ? err.message : "Unknown error"),
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="New Inventory Item"
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
                <Text variant="h3">Item Details</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Name *" value={name} onChangeText={setName} placeholder="Item name" />
                  <Input label="SKU *" value={sku} onChangeText={setSku} placeholder="e.g. RICE-25KG" />
                  <View>
                    <Text variant="caption" className="mb-1">Category</Text>
                    <View className="flex-row gap-2 flex-wrap">
                      {["general", "food", "household", "electronics"].map((cat) => (
                        <Button key={cat} variant={category === cat ? "primary" : "outline"} size="sm" onPress={() => setCategory(cat)}>
                          {cat}
                        </Button>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text variant="caption" className="mb-1">Unit</Text>
                    <View className="flex-row gap-2 flex-wrap">
                      {["unit", "kg", "bag", "carton", "bottle"].map((u) => (
                        <Button key={u} variant={unit === u ? "primary" : "outline"} size="sm" onPress={() => setUnit(u)}>
                          {u}
                        </Button>
                      ))}
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Pricing</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Standard Cost *" value={cost} onChangeText={setCost} placeholder="0.00" keyboardType="decimal-pad" />
                  <Input label="Reorder Level" value={reorderLevel} onChangeText={setReorderLevel} placeholder="0" keyboardType="number-pad" />
                </View>
              </CardContent>
            </Card>

            <Button
              onPress={() => mutation.mutate({ name, sku, category, unitOfMeasure: unit, standardCost: cost, reorderLevel: parseInt(reorderLevel), costMethod: "weighted_average" })}
              disabled={!name || !sku || !cost || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Item"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}