import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@xenboox/ui"
import { Link } from "react-router-dom"
import { BookOpen, CreditCard, FileText, Users, BarChart3, Wallet, Smartphone, HardHat, Boxes, Landmark } from "lucide-react"

const modules = [
  {
    name: "Chart of Accounts",
    href: "/docs/modules/coa",
    description: "Manage your chart of accounts and account structure",
    icon: BookOpen,
    tag: "Accounting"
  },
  {
    name: "Journal Entries",
    href: "/docs/modules/journal",
    description: "Record and review journal entries for all transactions",
    icon: FileText,
    tag: "Accounting"
  },
  {
    name: "Accounts Payable",
    href: "/docs/modules/ap",
    description: "Manage suppliers, purchase orders, and bills",
    icon: CreditCard,
    tag: "Payables"
  },
  {
    name: "Accounts Receivable",
    href: "/docs/modules/ar",
    description: "Manage customers, invoices, and payments",
    icon: CreditCard,
    tag: "Receivables"
  },
  {
    name: "Fiscal Periods",
    href: "/docs/modules/fiscal",
    description: "Manage fiscal years, periods, and closing processes",
    icon: Landmark,
    tag: "Accounting"
  },
  {
    name: "Bank Accounts & Cash",
    href: "/docs/modules/treasury",
    description: "Manage bank accounts, cash, and petty cash",
    icon: Wallet,
    tag: "Treasury"
  },
  {
    name: "Mobile Money",
    href: "/docs/modules/mobile-money",
    description: "Track mobile money transactions and accounts",
    icon: Smartphone,
    tag: "Treasury"
  },
  {
    name: "Payroll",
    href: "/docs/modules/payroll",
    description: "Manage employees and payroll runs",
    icon: Users,
    tag: "Payroll"
  },
  {
    name: "Fixed Assets",
    href: "/docs/modules/assets",
    description: "Track and depreciate fixed assets",
    icon: HardHat,
    tag: "Assets"
  },
  {
    name: "Inventory",
    href: "/docs/modules/inventory",
    description: "Manage inventory items and warehouses",
    icon: Boxes,
    tag: "Inventory"
  },
  {
    name: "Financial Reports",
    href: "/docs/modules/reports",
    description: "View profit & loss, balance sheet, and trial balance",
    icon: BarChart3,
    tag: "Reports"
  },
  {
    name: "Documents",
    href: "/docs/modules/documents",
    description: "Store and organize financial documents",
    icon: FolderOpen,
    tag: "Documents"
  }
]

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Module Documentation</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <module.icon className="h-5 w-5 text-primary" />
                  {module.name}
                </span>
                <Badge variant="secondary">{module.tag}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">{module.description}</p>
              <Button asChild size="sm">
                <Link to={module.href}>View Documentation</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}