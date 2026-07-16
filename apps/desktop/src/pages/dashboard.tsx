import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Wallet, FileText, Users, Calendar } from "lucide-react"

type StatCardProps = {
  title: string
  value: string
  icon: React.ReactNode
  description?: string
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data, isLoading } = trpc.organization.getEntitySummary.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Cash Balance"
          value={formatCurrency(data?.cashBalance ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          description="Across all accounts"
        />
        <StatCard
          title="AP Outstanding"
          value={formatCurrency(data?.apOutstanding ?? 0)}
          icon={<FileText className="h-4 w-4" />}
          description="Bills to pay"
        />
        <StatCard
          title="AR Outstanding"
          value={formatCurrency(data?.arOutstanding ?? 0)}
          icon={<Users className="h-4 w-4" />}
          description="Invoices to collect"
        />
        <StatCard
          title="Current Period"
          value={data?.currentPeriod ?? "N/A"}
          icon={<Calendar className="h-4 w-4" />}
          description="Fiscal period"
        />
      </div>
    </div>
  )
}
