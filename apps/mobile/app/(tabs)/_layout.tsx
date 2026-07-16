import { Tabs } from "expo-router"
import { LayoutDashboard, MessageSquare, FileText, Package, Settings } from "lucide-react-native"

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, React.ComponentType<any>> = {
    dashboard: LayoutDashboard,
    chat: MessageSquare,
    invoices: FileText,
    modules: Package,
    settings: Settings,
  }
  const Icon = icons[name] || LayoutDashboard
  return <Icon size={22} color={focused ? "#2563eb" : "#94a3b8"} />
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          borderTopColor: "#e2e8f0",
          backgroundColor: "#ffffff"
        },
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="dashboard" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Assistant",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="chat" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="invoices" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title: "Modules",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="modules" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="settings" focused={focused} />
        }}
      />
    </Tabs>
  )
}