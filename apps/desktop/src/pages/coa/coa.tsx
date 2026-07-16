import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { BookOpen } from "lucide-react"

export default function COAPage() {
  const { data } = trpc.journal.listJournalEntries.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3">Account Categories</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-md bg-green-50 p-3 text-center dark:bg-green-950">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Assets</p>
                  <p className="text-xs text-green-600 dark:text-green-400">1000-1999</p>
                </div>
                <div className="rounded-md bg-red-50 p-3 text-center dark:bg-red-950">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Liabilities</p>
                  <p className="text-xs text-red-600 dark:text-red-400">2000-2999</p>
                </div>
                <div className="rounded-md bg-blue-50 p-3 text-center dark:bg-blue-950">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Equity</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">3000-3999</p>
                </div>
                <div className="rounded-md bg-purple-50 p-3 text-center dark:bg-purple-950">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Revenue</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">4000-4999</p>
                </div>
                <div className="rounded-md bg-orange-50 p-3 text-center dark:bg-orange-950">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Expenses</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">5000-5999</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Chart of accounts with {data?.length || 0} journal entries posted across all categories.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}