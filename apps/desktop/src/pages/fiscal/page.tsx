import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"

export default function FiscalPeriodsPage() {
  const { data: periods, isLoading } = useQuery({
    queryKey: ["fiscal-periods"],
    queryFn: () => api.fiscal.list.useQuery()
  })

  if (isLoading) return <div className="p-6">Loading...</div>

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Fiscal Periods</h1>
        <p className="text-muted-foreground">Manage fiscal periods for accounting.</p>
        
        {periods?.data?.length === 0 ? (
          <p className="mt-4">No fiscal periods configured.</p>
        ) : (
          <div className="mt-4">
            {periods?.data?.map((period: any) => (
              <div key={period.id} className="border rounded-lg p-4 mb-2">
                <h3 className="font-semibold">{period.year}-{String(period.month).padStart(2, '0')}</h3>
                <p className="text-sm text-muted-foreground">Status: {period.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}