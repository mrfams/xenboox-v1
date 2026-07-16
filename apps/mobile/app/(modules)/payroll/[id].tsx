import { View, ScrollView, RefreshControl } from "react-native"
import { Text } from "@/components/ui/text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { trpc } from "@/lib/trpc"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState, useCallback } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="mb-3 flex-row justify-between">
      <Text variant="caption">{label}</Text>
      <Text variant="bodySmall" className="font-medium">
        {value ?? "—"}
      </Text>
    </View>
  )
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { data: employee, refetch } = trpc.payroll.getEmployeeById.useQuery({ id: id! })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (!employee) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Text variant="bodySmall">Loading...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header
        title={`${employee.firstName} ${employee.lastName}`}
        leftAction={
          <Text variant="body" className="text-primary-600" onPress={() => router.back()}>
            ← Back
          </Text>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="gap-4">
          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Personal Info</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Employee #" value={employee.employeeNumber} />
              <DetailRow label="Email" value={employee.email} />
              <DetailRow label="Phone" value={employee.phone} />
              <DetailRow label="Department" value={employee.department} />
              <DetailRow label="Job Title" value={employee.jobTitle} />
              <DetailRow label="Hire Date" value={employee.hireDate ? formatDate(employee.hireDate) : null} />
              <DetailRow label="Status" value={employee.status} />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <Text variant="h3">Bank Details</Text>
            </CardHeader>
            <CardContent>
              <DetailRow label="Bank Name" value={employee.bankName} />
              <DetailRow label="Account #" value={employee.bankAccountNumber} />
              <DetailRow label="Account Name" value={employee.bankAccountName} />
            </CardContent>
          </Card>

          {employee.contracts && employee.contracts.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Contracts</Text>
              </CardHeader>
              <CardContent>
                {employee.contracts.map((contract: any) => (
                  <View key={contract.id} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <DetailRow label="Type" value={contract.type} />
                    <DetailRow label="Start" value={contract.startDate ? formatDate(contract.startDate) : null} />
                    <DetailRow label="End" value={contract.endDate ? formatDate(contract.endDate) : "Ongoing"} />
                    <DetailRow label="Salary" value={contract.salary ? formatCurrency(contract.salary) : null} />
                  </View>
                ))}
              </CardContent>
            </Card>
          )}

          {employee.loans && employee.loans.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <Text variant="h3">Loans</Text>
              </CardHeader>
              <CardContent>
                {employee.loans.map((loan: any) => (
                  <View key={loan.id} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <DetailRow label="Amount" value={loan.amount ? formatCurrency(loan.amount) : null} />
                    <DetailRow label="Outstanding" value={loan.outstandingBalance ? formatCurrency(loan.outstandingBalance) : null} />
                    <DetailRow label="Monthly Deduction" value={loan.monthlyDeduction ? formatCurrency(loan.monthlyDeduction) : null} />
                    <DetailRow label="Status" value={loan.status} />
                  </View>
                ))}
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
