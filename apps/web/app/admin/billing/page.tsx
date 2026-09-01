import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@xenboox/ui";
import { DollarSign } from "lucide-react";
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Invoices, payments, and dunning
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <DollarSign className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Billing ledger will be connected to financial data
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check Financial → Business Health for now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
