import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function CreateAssetScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assetClass, setAssetClass] = useState("office_equipment")
  const [cost, setCost] = useState("")
  const [salvageValue, setSalvageValue] = useState("0")
  const [usefulLife, setUsefulLife] = useState("5")
  const [location, setLocation] = useState("")
  const utils = trpc.useUtils()

  const mutation = trpc.fixedAssets.createAsset.useMutation({
    onSuccess: () => {
      utils.fixedAssets.listAssets.invalidate()
      Alert.alert("Success", "Asset created", [{ text: "OK", onPress: () => router.back() }])
    },
    onError: (err: unknown) => Alert.alert("Error", err instanceof Error ? err.message : "Unknown error"),
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="New Fixed Asset"
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
                <Text variant="h3">Asset Details</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Name *" value={name} onChangeText={setName} placeholder="Asset name" />
                  <Input label="Description" value={description} onChangeText={setDescription} placeholder="Brief description" />
                  <View>
                    <Text variant="caption" className="mb-1">Asset Class</Text>
                    <View className="flex-row gap-2 flex-wrap">
                      {["office_equipment", "furniture", "vehicle", "building", "machinery"].map((cls) => (
                        <Button key={cls} variant={assetClass === cls ? "primary" : "outline"} size="sm" onPress={() => setAssetClass(cls)}>
                          {cls.replace("_", " ")}
                        </Button>
                      ))}
                    </View>
                  </View>
                  <Input label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Main Office" />
                </View>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Valuation</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Cost *" value={cost} onChangeText={setCost} placeholder="0.00" keyboardType="decimal-pad" />
                  <Input label="Salvage Value" value={salvageValue} onChangeText={setSalvageValue} placeholder="0.00" keyboardType="decimal-pad" />
                  <Input label="Useful Life (years)" value={usefulLife} onChangeText={setUsefulLife} placeholder="5" keyboardType="number-pad" />
                </View>
              </CardContent>
            </Card>

            <Button
              onPress={() => mutation.mutate({ name, description: description || undefined, assetClass, cost, salvageValue, usefulLife: parseInt(usefulLife), location: location || undefined, depreciationMethod: "straight_line" })}
              disabled={!name || !cost || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Asset"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}