import { View, ScrollView, Alert } from "react-native"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { EntitySwitcher } from "@/components/layout/entity-switcher"
import { useTheme } from "@/components/theme-provider"
import { clearAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { trpc } from "@/lib/trpc"
import { Sun, Moon, Monitor } from "lucide-react-native"

export default function SettingsScreen() {
  const router = useRouter()
  const { data: user } = trpc.organization.getCurrentUser.useQuery()
  const { theme, setTheme, resolved } = useTheme()

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearAuth()
          router.replace("/(auth)/login")
        }
      }
    ])
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header title="Settings" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <Text variant="h3">Account</Text>
          </CardHeader>
          <CardContent>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">
                  Name
                </Text>
                <Text variant="bodySmall">{user?.name || "—"}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">
                  Email
                </Text>
                <Text variant="bodySmall">{user?.email || "—"}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <Text variant="h3">Appearance</Text>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">
                  Current
                </Text>
                <Text variant="bodySmall" className="font-medium capitalize">
                  {theme === "system" ? `System (${resolved})` : theme}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Button
                  variant={theme === "light" ? "primary" : "outline"}
                  size="sm"
                  onPress={() => setTheme("light")}
                >
                  <Sun size={14} />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "primary" : "outline"}
                  size="sm"
                  onPress={() => setTheme("dark")}
                >
                  <Moon size={14} />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "primary" : "outline"}
                  size="sm"
                  onPress={() => setTheme("system")}
                >
                  <Monitor size={14} />
                  System
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        <EntitySwitcher />

        <Card variant="elevated">
          <CardHeader>
            <Text variant="h3">About</Text>
          </CardHeader>
          <CardContent>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">
                  Version
                </Text>
                <Text variant="bodySmall">1.0.0</Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">
                  Build
                </Text>
                <Text variant="bodySmall">1</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <Button variant="danger" onPress={handleLogout}>
          Sign Out
        </Button>
      </ScrollView>
    </View>
  )
}