"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { TableSkeleton } from "@/components/shared/loading"
import { EmptyState } from "@/components/shared/empty-state"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Badge } from "@/components/ui"
import { formatCurrency } from "@/lib/utils"
import { BarChart3 } from "lucide-react"

function AccountTable({
  accounts,
  colorClass,
}: {
  accounts: Array<{ accountId: string; code: string; name: string; displayAmount: number }>
  colorClass: string
}) {
  if (accounts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">No accounts</p>
    )
  }
  return (
    <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Account</th>
          <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Amount</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((acc) => (
          <tr key={acc.accountId} className="border-b last:border-0">
            <td className="py-2 text-sm">
              <span className="font-mono text-muted-foreground mr-2">{acc.code}</span>
              {acc.name}
            </td>
            <td className={`py-2 text-sm text-right font-mono ${colorClass}`}>
              {formatCurrency(acc.displayAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

export default function BalanceSheetPage() {
  const { data: periods } = trpc.reports.listPeriods.useQuery()
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")

  const { data: report, isLoading } = trpc.reports.getBalanceSheet.useQuery(
    { periodId: selectedPeriod || undefined },
    { enabled: true }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        description="Assets, liabilities, and equity position"
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

        {report && (
          <Badge variant={report.isBalanced ? "default" : "destructive"}>
            {report.isBalanced ? "Balanced (A = L + E)" : "Out of Balance"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <TableSkeleton rows={4} columns={2} />
          <TableSkeleton rows={4} columns={2} />
          <TableSkeleton rows={4} columns={2} />
        </div>
      ) : report ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountTable accounts={report.assets.accounts} colorClass="text-foreground" />
              <div className="mt-4 flex items-center justify-between border-t-2 pt-3 font-bold">
                <span className="text-sm">Total Assets</span>
                <span className="text-sm font-mono">{formatCurrency(report.assets.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountTable accounts={report.liabilities.accounts} colorClass="text-foreground" />
              <div className="mt-4 flex items-center justify-between border-t-2 pt-3 font-bold">
                <span className="text-sm">Total Liabilities</span>
                <span className="text-sm font-mono">{formatCurrency(report.liabilities.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountTable accounts={report.equity.accounts} colorClass="text-foreground" />
              <div className="mt-4 flex items-center justify-between border-t-2 pt-3 font-bold">
                <span className="text-sm">Total Equity</span>
                <span className="text-sm font-mono">{formatCurrency(report.equity.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-xl font-bold font-mono">{formatCurrency(report.assets.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Liabilities + Equity</p>
                  <p className="text-xl font-bold font-mono">
                    {formatCurrency(report.liabilities.total + report.equity.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={`text-xl font-bold font-mono ${
                    report.isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}>
                    {formatCurrency(report.assets.total - report.liabilities.total - report.equity.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="No data yet"
          description="Post journal entries to generate the balance sheet"
        />
      )}
    </div>
  )
}
