import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { BarChart3, TrendingUp, FileText, PieChart } from "lucide-react"

export default function ReportsPage() {
  const reports = [
    { name: "Profit & Loss", description: "Revenue and expenses for a period", icon: TrendingUp, status: "available" },
    { name: "Balance Sheet", description: "Assets, liabilities, and equity", icon: PieChart, status: "available" },
    { name: "Trial Balance", description: "Debit and credit totals", icon: BarChart3, status: "available" },
    { name: "Cash Flow", description: "Cash inflows and outflows", icon: FileText, status: "coming_soon" },
    { name: "Aged Payables", description: "Outstanding bills by age", icon: FileText, status: "coming_soon" },
    { name: "Aged Receivables", description: "Outstanding invoices by age", icon: FileText, status: "coming_soon" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.name} className={report.status === "coming_soon" ? "opacity-60" : "cursor-pointer hover:bg-accent/50"}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <report.icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{report.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{report.description}</p>
              {report.status === "coming_soon" && (
                <p className="text-xs text-muted-foreground mt-2 italic">Coming soon</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}