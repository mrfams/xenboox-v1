"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from "@xenboox/ui";
import {
  CreditCard,
  ExternalLink,
  Users,
  FileText,
  Receipt,
  Download,
  Calendar,
  TrendingUp,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 entity", "1 user", "Basic reporting", "Community support"],
    limits: {
      entities: 1,
      users: 1,
      documents: 100,
      storage: "100 MB",
      agentRuns: 10,
    },
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  starter: {
    name: "Starter",
    price: "$29",
    period: "/month",
    features: ["3 entities", "5 users", "Advanced reporting", "Email support"],
    limits: {
      entities: 3,
      users: 5,
      documents: 1000,
      storage: "5 GB",
      agentRuns: 100,
    },
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  },
  growth: {
    name: "Growth",
    price: "$79",
    period: "/month",
    features: ["10 entities", "20 users", "AI agents", "Priority support"],
    limits: {
      entities: 10,
      users: 20,
      documents: 5000,
      storage: "50 GB",
      agentRuns: 500,
    },
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  pro: {
    name: "Pro",
    price: "$199",
    period: "/month",
    features: [
      "Unlimited entities",
      "Unlimited users",
      "All AI agents",
      "Dedicated support",
    ],
    limits: {
      entities: Infinity,
      users: Infinity,
      documents: Infinity,
      storage: "500 GB",
      agentRuns: Infinity,
    },
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
  },
  firm: {
    name: "Firm",
    price: "Custom",
    period: "",
    features: [
      "Multi-client management",
      "White-label",
      "Custom integrations",
      "SLA guarantee",
    ],
    limits: {
      entities: Infinity,
      users: Infinity,
      documents: Infinity,
      storage: "Unlimited",
      agentRuns: Infinity,
    },
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  },
} as const;

export function BillingSection() {
  const { data: billing, isLoading } = trpc.settings.getBillingInfo.useQuery();
  const { data: orgs } = trpc.organization.list.useQuery();
  const { data: entitySummary } = trpc.organization.getEntitySummary.useQuery();
  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const { data: members } = trpc.organization.listMembers.useQuery(
    { entityId: entities?.[0]?.id ?? "" },
    { enabled: !!entities?.[0]?.id },
  );

  const org = orgs?.[0];
  const plan = billing?.plan ?? org?.plan ?? "free";
  const planInfo = PLAN_DETAILS[plan] ?? PLAN_DETAILS.free;
  const billingCurrency =
    (entities?.[0] as { currency?: string } | undefined)?.currency ?? "USD";

  const usage = {
    users: members?.length ?? 0,
    entities: billing?.entityCount ?? entities?.length ?? 0,
    cashBalance: entitySummary?.cashBalance ?? 0,
    apOutstanding: entitySummary?.apOutstanding ?? 0,
    arOutstanding: entitySummary?.arOutstanding ?? 0,
    currentPeriod: entitySummary?.currentPeriod ?? "No period",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing details.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Manage Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${planInfo.color}`}
                  >
                    {planInfo.name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {planInfo.price === "$0" || planInfo.price === "Custom"
                        ? planInfo.price
                        : new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: billingCurrency,
                            maximumFractionDigits: 0,
                          }).format(
                            Number(planInfo.price.replace(/[^0-9.]/g, "")) || 0,
                          )}
                    </span>
                    {planInfo.period && (
                      <span className="text-sm text-muted-foreground">
                        {planInfo.period}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {planInfo.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      <span className="h-1 w-1 rounded-full bg-balanced-green" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Limits */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-3">Plan Limits</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Entities",
                  value: usage.entities,
                  limit: planInfo.limits.entities,
                },
                {
                  label: "Users",
                  value: usage.users,
                  limit: planInfo.limits.users,
                },
                {
                  label: "Current Period",
                  value: usage.currentPeriod,
                  limit: "",
                },
                {
                  label: "Cash Balance",
                  value: new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: billingCurrency,
                  }).format(usage.cashBalance),
                  limit: "",
                },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-lg font-bold">
                    {item.value}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{item.limit === Infinity ? "∞" : item.limit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Usage This Period
          </CardTitle>
          <CardDescription>
            Current resource usage for this billing period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Team Members
                </div>
                <span className="text-xs text-muted-foreground">
                  {usage.users}/
                  {planInfo.limits.users === Infinity
                    ? "∞"
                    : planInfo.limits.users}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(
                      (usage.users /
                        (planInfo.limits.users === Infinity
                          ? 100
                          : planInfo.limits.users)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Entities
                </div>
                <span className="text-xs text-muted-foreground">
                  {usage.entities}/
                  {planInfo.limits.entities === Infinity
                    ? "∞"
                    : planInfo.limits.entities}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(
                      (usage.entities /
                        (planInfo.limits.entities === Infinity
                          ? 100
                          : planInfo.limits.entities)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Cash Balance
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: billingCurrency,
                  }).format(usage.cashBalance)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
                <div
                  className="h-full bg-balanced-green rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Current Period
                </div>
                <span className="text-xs text-muted-foreground">
                  {usage.currentPeriod}
                </span>
              </div>
              <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method & Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Payment & Invoices
          </CardTitle>
          <CardDescription>
            Manage your payment methods and view billing history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                No payment method on file
              </p>
            </div>
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-1" />
              Add Payment Method
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Billing History</p>
              <p className="text-sm text-muted-foreground">
                View and download past invoices
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              View Invoices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
