import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@xenboox/ui";
import { Wrench } from "lucide-react";
export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">
          Service health, uptime, and dependencies
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Service catalog will mirror infrastructure health
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            See Infrastructure Health for now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
