import { Card, CardContent, CardHeader, CardTitle, Badge } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { BookOpen } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Account = {
  id: string
  code: string
  name: string
  type: string
  subtype: string
  description?: string | null
  isActive: boolean | null
  parentId?: string | null
  debit: number
  credit: number
  balance: number
}

export default function COAPage() {
  const { data: accounts, isLoading } = trpc.coa.list.useQuery()

  const accountsByType = accounts?.reduce<Record<string, Account[]>>((acc, account) => {
    const type = account.type
    if (!acc[type]) acc[type] = []
    acc[type].push({
      ...account,
      debit: 0,
      credit: 0,
      balance: 0,
    })
    return acc
  }, {}) || {}

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
  }

  const typeColors: Record<string, string> = {
    asset: "text-green-600",
    liability: "text-red-600",
    equity: "text-blue-600",
    revenue: "text-purple-600",
    expense: "text-orange-600",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(typeLabels).map(([type, label]) => (
              <div key={type} className="rounded-md bg-muted/50 p-3 text-center">
                <p className="text-sm font-medium">
                  {label}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {accountsByType[type]?.length || 0} accounts
                  </span>
                </p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(typeLabels).map(([type, label]) => {
                  const typeAccounts = accountsByType[type] || []
                  if (typeAccounts.length === 0) return null

                  return (
                    <div key={type}>
                      <h3 className={`text-sm font-medium ${typeColors[type] || ""}`}>{label}</h3>
                      <div className="mt-2 space-y-1">
                        {typeAccounts.map(account => (
                          <div key={account.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {account.code} - {account.name}
                            </span>
                            <Badge variant={account.isActive !== false ? "outline" : "secondary"}>
                              {account.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}