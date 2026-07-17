import { useState } from "react"
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { Text } from "@/components/ui/text"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "expo-router"
import { trpc } from "@/lib/trpc"
import { setToken, setCurrentEntityId } from "@/lib/auth"

export default function RegisterScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [error, setError] = useState("")
  const registerMutation = trpc.auth.register.useMutation()

  async function handleRegister() {
    if (!name || !email || !password || !organizationName) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setError("")

    try {
      const result = await registerMutation.mutateAsync({
        name,
        email,
        password,
        organizationName,
      })
      await setToken(result.token)
      if (result.entityId) {
        await setCurrentEntityId(result.entityId)
      }
      router.replace("/(tabs)")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 bg-white dark:bg-slate-900">
          <View className="mb-8 items-center">
            <Text variant="h1" className="mb-2">
              Xenboox
            </Text>
            <Text variant="body" className="text-slate-500">
              Create your account
            </Text>
          </View>

          <View className="gap-1">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />

            <Input
              label="Organization Name"
              placeholder="Acme Corp"
              value={organizationName}
              onChangeText={setOrganizationName}
            />

            <Input
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? (
              <Text variant="caption" className="mb-2 text-danger">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={handleRegister}
              loading={registerMutation.isPending}
              className="mt-2"
            >
              Create Account
            </Button>

            <View className="mt-6 items-center">
              <Link href="/(auth)/login" asChild>
                <Button variant="ghost" size="sm">
                  Already have an account? Sign in
                </Button>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
