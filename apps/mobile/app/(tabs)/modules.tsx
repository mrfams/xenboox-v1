import { View, Pressable } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { useRouter } from "expo-router"
import { DollarSign, Building2, Package, BarChart3, FileText, Users, Receipt } from "lucide-react-native"

const modules = [
  {
    id: "payroll",
    name: "Payroll",
    description: "Employees, salaries, and pay runs",
    icon: DollarSign,
    route: "/(modules)/payroll" as const
  },
  {
    id: "fixed-assets",
    name: "Fixed Assets",
    description: "Asset register and depreciation",
    icon: Building2,
    route: "/(modules)/fixed-assets" as const
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Stock items and movements",
    icon: Package,
    route: "/(modules)/inventory" as const
  },
  {
    id: "journal",
    name: "Journal",
    description: "Double-entry journal entries",
    icon: FileText,
    route: "/(modules)/journal" as const
  },
  {
    id: "ap",
    name: "Accounts Payable",
    description: "Suppliers, POs, and bills",
    icon: Receipt,
    route: "/(modules)/ap" as const
  },
  {
    id: "ar",
    name: "Accounts Receivable",
    description: "Customers and sales invoices",
    icon: Users,
    route: "/(modules)/ar" as const
  },
  {
    id: "reports",
    name: "Reports",
    description: "Financial and management reports",
    icon: BarChart3,
    route: "/(tabs)" as const
  }
]

export default function ModulesScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header title="Modules" />

      <View className="flex-1 p-4">
        <Text variant="h2" className="mb-4">
          Accounting Modules
        </Text>

        <View className="gap-3">
          {modules.map((mod) => (
            <Pressable
              key={mod.id}
              onPress={() => router.push(mod.route)}
            >
              <Card variant="elevated">
                <CardContent>
                  <View className="flex-row items-center gap-4">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                      <mod.icon size={24} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <Text variant="body" className="font-medium">
                        {mod.name}
                      </Text>
                      <Text variant="caption">{mod.description}</Text>
                    </View>
                    <Text variant="caption" className="text-slate-400">
                      ›
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}