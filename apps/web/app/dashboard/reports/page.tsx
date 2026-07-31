"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { ReportingLiveness } from "@/components/agents/reporting-liveness";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  BarChart3,
  Scale,
  TrendingUp,
  Download,
  Calendar,
  Clock,
  ChevronRight,
  MessageSquare,
  Send,
  Wallet,
  Receipt,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function handleExport(report: string) {
  const blob = new Blob(
    [`Report: ${report}\nGenerated: ${new Date().toISOString()}\n`],
    { type: "text/plain" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const reportTypes = [
  {
    title: "Trial Balance",
    description:
      "Summary of all account balances to verify debits equal credits",
    href: "/dashboard/trial-balance",
    icon: Scale,
    lastGenerated: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    title: "Profit & Loss",
    description: "Income statement showing revenue, expenses, and net income",
    href: "/dashboard/reports/profit-and-loss",
    icon: TrendingUp,
    lastGenerated: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity position at a point in time",
    href: "/dashboard/reports/balance-sheet",
    icon: BarChart3,
    lastGenerated: new Date(Date.now() - 1000 * 60 * 180),
  },
  {
    title: "Cash Flow",
    description: "Cash inflows and outflows for the period",
    href: "/dashboard/reports/cash-flow",
    icon: Wallet,
    lastGenerated: new Date(Date.now() - 1000 * 60 * 240),
  },
  {
    title: "AR Aging",
    description: "Outstanding receivables aged by 30/60/90+ day buckets",
    href: "/dashboard/ar/aging",
    icon: Receipt,
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    title: "AP Aging",
    description: "Outstanding payables aged by 30/60/90+ day buckets",
    href: "/dashboard/ap/payment-schedule",
    icon: Receipt,
    lastGenerated: null,
  },
];

function ScheduleDialog({ reportTitle }: { reportTitle: string }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState("weekly");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <Calendar className="mr-1.5 h-3 w-3" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule {reportTitle}</DialogTitle>
          <DialogDescription>
            Set up automatic delivery of this report to your email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="you@company.com"
              defaultValue="ap@entity.xenboox.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Confirm Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportsPage() {
  const [customQuery, setCustomQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Generate, export, and schedule financial statements"
      />

      <SubPageTabs tabs={MODULE_TABS.reports} />

      <ReportingLiveness />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.href} className="flex flex-col">
            <Link href={report.href} className="flex-1">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{report.title}</CardTitle>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="py-0">
                <CardDescription>{report.description}</CardDescription>
                {report.lastGenerated ? (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Generated{" "}
                    {formatDistanceToNow(report.lastGenerated, {
                      addSuffix: true,
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Not yet generated
                  </div>
                )}
              </CardContent>
            </Link>
            <CardFooter className="border-t px-4 py-2.5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => handleExport(report.title)}
              >
                <Download className="mr-1.5 h-3 w-3" />
                Export
              </Button>
              <ScheduleDialog reportTitle={report.title} />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Custom Report Request */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask for a Custom Report
          </CardTitle>
          <CardDescription>
            Describe the report you need in plain English — our reporting agent
            will build it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submittedQuery ? (
            <div className="rounded-lg bg-primary/5 border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0 mt-0.5">
                  You
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {submittedQuery}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default" className="shrink-0 mt-0.5 bg-primary">
                  Reporting Agent
                </Badge>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    I&apos;m working on generating this report. I&apos;ll show a
                    preview here once it&apos;s ready. In the meantime, you can
                    refine your request or ask for a different report.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Refine Request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setSubmittedQuery(null)}
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customQuery.trim()) {
                  setSubmittedQuery(customQuery.trim());
                  setCustomQuery("");
                }
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="e.g. Show me a comparison of revenue by product line for Q1 and Q2"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!customQuery.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Ask Agent
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
