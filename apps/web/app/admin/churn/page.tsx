import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@xenboox/ui";
import { UserX } from "lucide-react";

export default function ChurnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Churn & Retention</h1>
        <p className="text-muted-foreground mt-1">
          Track churn risk, cohort retention, and win-back performance
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <UserX className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Cohort retention, churn scoring, and win-back automation are being
              wired to live data
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use Customer Health for now — churn will surface there first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
