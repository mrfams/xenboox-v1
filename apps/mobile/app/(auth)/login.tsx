import { useState } from "react"
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { Text } from "@/components/ui/text"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "expo-router"
import { trpc } from "@/lib/trpc"
import { setToken, setCurrentEntityId } from "@/lib/auth"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const loginMutation = trpc.auth.login.useMutation()

  async function handleLogin() {
    if (!email || !password) {
      setError("Email and password are required")
      return
    }

    setError("")

    try {
      const result = await loginMutation.mutateAsync({ email, password })
      await setToken(result.token)
      if (result.entityId) {
        await setCurrentEntityId(result.entityId)
      }
      router.replace("/(tabs)")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
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
              Your AI accounting workforce
            </Text>
          </View>

          <View className="gap-1">
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {error ? (
              <Text variant="caption" className="mb-2 text-danger">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={handleLogin}
              loading={loginMutation.isPending}
              className="mt-2"
            >
              Sign In
            </Button>

            <View className="mt-6 items-center">
              <Link href="/(auth)/register" asChild>
                <Button variant="ghost" size="sm">
                  Don't have an account? Sign up
                </Button>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
