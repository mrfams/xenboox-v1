import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"

export default function MobileMoneyPage() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["mobile-money-accounts"],
    queryFn: () => api.mobileMoney.listAccounts.useQuery()
  })

  if (isLoading) return <div className="p-6">Loading...</div>

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Mobile Money</h1>
        <p className="text-muted-foreground">Manage mobile money accounts and transactions.</p>
        
        {accounts?.data?.length === 0 ? (
          <p className="mt-4">No mobile money accounts configured.</p>
        ) : (
          <div className="mt-4">
            {accounts?.data?.map((account: any) => (
              <div key={account.id} className="border rounded-lg p-4 mb-2">
                <h3 className="font-semibold">{account.accountName}</h3>
                <p className="text-sm text-muted-foreground">{account.provider} - {account.phoneNumber}</p>
                <p className="text-sm">Balance: {account.currentBalance} {account.currency}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}