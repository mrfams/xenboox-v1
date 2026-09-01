import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@xenboox/ui";
import { CreditCard } from "lucide-react";
export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Plan distribution, MRR, and lifecycle
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Subscription metrics will be powered by billing data
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            See Organizations and Analytics for now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
