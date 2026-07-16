import { Card, CardContent, CardHeader, CardTitle, Select, SelectContent,SelectItem, SelectTrigger, SelectValue } from "@xenboox/ui"
import { BarChart3, TrendingUp, FileText, PieChart, AlertCircle } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useState } from "react"
import { formatCurrency } from "@/lib/utils"

type ReportSection = {
  label: string
  accounts: { accountId: string; code: string; name: string; type: string; debit: number; credit: number; balance: number; displayAmount: number }[]
  total: number
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<"profit-loss" | "balance-sheet" | "trial-balance">("profit-loss")
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined)

  const { data: periods } = trpc.reports.listPeriods.useQuery()
  const { data: profitAndLoss, isLoading: isLoadingPnl, error: pnlError } = trpc.reports.getProfitAndLoss.useQuery(
    selectedPeriod ? { periodId: selectedPeriod } : {}
  )
  const { data: balanceSheet, isLoading: isLoadingBs, error: bsError } = trpc.reports.getBalanceSheet.useQuery(
    selectedPeriod ? { periodId: selectedPeriod } : {}
  )

  const isLoading = isLoadingPnl || isLoadingBs
  const error = pnlError || bsError

  const renderProfitAndLoss = () => {
    if (!profitAndLoss) return null

    const revenueTotal = profitAndLoss.revenue.total
    const expenseTotal = profitAndLoss.expenses.total
    const netIncome = profitAndLoss.netIncome

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(revenueTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(expenseTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netIncome)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profitAndLoss.revenue.accounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{acc.code} - {acc.name}</span>
                    <span className="font-mono">{formatCurrency(acc.displayAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profitAndLoss.expenses.accounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{acc.code} - {acc.name}</span>
                    <span className="font-mono">{formatCurrency(acc.displayAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderBalanceSheet = () => {
    if (!balanceSheet) return null

    const totalAssets = balanceSheet.assets.total
    const totalLiabilities = balanceSheet.liabilities.total
    const totalEquity = balanceSheet.equity.total
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAssets)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalEquity)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {balanceSheet.assets.accounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{acc.code} - {acc.name}</span>
                    <span className="font-mono">{formatCurrency(acc.displayAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {balanceSheet.liabilities.accounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{acc.code} - {acc.name}</span>
                    <span className="font-mono text-red-600">{formatCurrency(acc.displayAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {balanceSheet.equity.accounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{acc.code} - {acc.name}</span>
                    <span className="font-mono text-blue-600">{formatCurrency(acc.displayAmount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-2 border-t">
                <div className="flex justify-between font-bold">
                  <span>Total L&E</span>
                  <span className="font-mono">{formatCurrency(totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!balanceSheet.isBalanced && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Balance sheet does not balance. Assets ≠ Liabilities + Equity</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderTrialBalance = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trial Balance (Coming Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Trial balance report will be available in a future update.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedReport("profit-loss")}
            className={`px-4 py-2 text-sm rounded-md border ${
              selectedReport === "profit-loss"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setSelectedReport("balance-sheet")}
            className={`px-4 py-2 text-sm rounded-md border ${
              selectedReport === "balance-sheet"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setSelectedReport("trial-balance")}
            className={`px-4 py-2 text-sm rounded-md border ${
              selectedReport === "trial-balance"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Trial Balance
          </button>
        </div>

        {periods && periods.length > 0 && (
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            placeholder="Select period"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name || period.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && selectedReport === "profit-loss" && renderProfitAndLoss()}
      {!isLoading && !error && selectedReport === "balance-sheet" && renderBalanceSheet()}
      {!isLoading && !error && selectedReport === "trial-balance" && renderTrialBalance()}
    </div>
  )
}