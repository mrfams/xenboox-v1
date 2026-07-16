"use client"

import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { BarChart3, Scale, TrendingUp } from "lucide-react"

const reportTypes = [
  {
    title: "Trial Balance",
    description: "Summary of all account balances to verify debits equal credits",
    href: "/dashboard/reports/trial-balance",
    icon: Scale,
  },
  {
    title: "Profit & Loss",
    description: "Income statement showing revenue, expenses, and net income",
    href: "/dashboard/reports/profit-and-loss",
    icon: TrendingUp,
  },
  {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity position at a point in time",
    href: "/dashboard/reports/balance-sheet",
    icon: BarChart3,
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Generate and view financial statements"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="transition-colors hover:bg-accent cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
