"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { TableSkeleton } from "@/components/shared/loading"
import { EmptyState } from "@/components/shared/empty-state"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp } from "lucide-react"

export default function ProfitAndLossPage() {
  const { data: periods } = trpc.reports.listPeriods.useQuery()
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")

  const { data: report, isLoading } = trpc.reports.getProfitAndLoss.useQuery(
    { periodId: selectedPeriod || undefined },
    { enabled: true }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        description="Revenue, expenses, and net income"
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="All periods (cumulative)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All periods</SelectItem>
              {periods?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.year}-{String(p.month).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <TableSkeleton rows={4} columns={3} />
          <TableSkeleton rows={4} columns={3} />
        </div>
      ) : report ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Account</th>
                    <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.revenue.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-sm text-muted-foreground">
                        No revenue entries
                      </td>
                    </tr>
                  ) : (
                    report.revenue.accounts.map((acc) => (
                      <tr key={acc.accountId} className="border-b last:border-0">
                        <td className="py-2 text-sm">
                          <span className="font-mono text-muted-foreground mr-2">{acc.code}</span>
                          {acc.name}
                        </td>
                        <td className="py-2 text-sm text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(acc.displayAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-2 text-sm">Total Revenue</td>
                    <td className="py-2 text-sm text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(report.revenue.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-700 dark:text-red-400">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Account</th>
                    <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-sm text-muted-foreground">
                        No expense entries
                      </td>
                    </tr>
                  ) : (
                    report.expenses.accounts.map((acc) => (
                      <tr key={acc.accountId} className="border-b last:border-0">
                        <td className="py-2 text-sm">
                          <span className="font-mono text-muted-foreground mr-2">{acc.code}</span>
                          {acc.name}
                        </td>
                        <td className="py-2 text-sm text-right font-mono text-red-700 dark:text-red-400">
                          {formatCurrency(acc.displayAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-2 text-sm">Total Expenses</td>
                    <td className="py-2 text-sm text-right font-mono text-red-700 dark:text-red-400">
                      {formatCurrency(report.expenses.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Net Income */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Net Income</span>
                <span className={`text-2xl font-bold font-mono ${
                  report.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                }`}>
                  {formatCurrency(report.netIncome)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="No data yet"
          description="Post journal entries to generate financial reports"
        />
      )}
    </div>
  )
}
