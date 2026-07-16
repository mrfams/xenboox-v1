import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function CreateEmployeeScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const utils = trpc.useUtils()

  const mutation = trpc.payroll.createEmployee.useMutation({
    onSuccess: () => {
      utils.payroll.listEmployees.invalidate()
      Alert.alert("Success", "Employee created", [{ text: "OK", onPress: () => router.back() }])
    },
    onError: (err: unknown) => Alert.alert("Error", err instanceof Error ? err.message : "Unknown error"),
  })

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title="New Employee"
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
                <Text variant="h3">Personal Information</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="First" />
                    </View>
                    <View className="flex-1">
                      <Input label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Last" />
                    </View>
                  </View>
                  <Input label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" />
                </View>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Employment</Text>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input label="Department" value={department} onChangeText={setDepartment} placeholder="e.g. Finance" />
                  <Input label="Job Title" value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Accountant" />
                </View>
              </CardContent>
            </Card>

            <Button
              onPress={() => mutation.mutate({ firstName, lastName, email: email || undefined, department: department || undefined, jobTitle: jobTitle || undefined })}
              disabled={!firstName || !lastName || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Employee"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}