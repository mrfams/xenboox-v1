"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";

export default function CashFlowPage() {
  const { data: periods } = trpc.reports.listPeriods.useQuery();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const { data: bankAccounts } = trpc.treasury.listBankAccounts.useQuery();
  const { data: arInvoices } = trpc.ar.listInvoices.useQuery({});
  const { data: apInvoices } = trpc.ap.listInvoices.useQuery();

  const totalCash = (bankAccounts ?? []).reduce(
    (s, a) => s + Number(a.currentBalance),
    0,
  );
  const totalReceivables = (arInvoices ?? [])
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPayables = (apInvoices ?? [])
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  const sections = [
    {
      label: "Operating Activities",
      items: [
        { label: "Cash from customers", amount: totalReceivables },
        { label: "Cash paid to suppliers", amount: -totalPayables },
      ],
    },
    {
      label: "Investing Activities",
      items: [{ label: "Net change in fixed assets", amount: 0 }],
    },
    {
      label: "Financing Activities",
      items: [{ label: "Net change in borrowings", amount: 0 }],
    },
  ];

  function handleExport() {
    const rows = [["Section", "Item", "Amount"]];
    for (const section of sections) {
      for (const item of section.items) {
        rows.push([section.label, item.label, String(item.amount)]);
      }
      const total = section.items.reduce((s, i) => s + i.amount, 0);
      rows.push([section.label, "Net", String(total)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow Statement"
        description="Cash inflows and outflows for the period"
        action={{
          label: "Export CSV",
          onClick: handleExport,
          icon: <Download className="mr-2 h-4 w-4" />,
        }}
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {(periods ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {(p as any).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
          const total = section.items.reduce((s, i) => s + i.amount, 0);
          return (
            <Card key={section.label}>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-sm py-1.5"
                    >
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className={`font-mono font-medium tabular-nums ${item.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {item.amount >= 0 ? "" : "-"}
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-2 mt-2 text-sm font-semibold">
                    <span>Net {section.label}</span>
                    <span
                      className={`font-mono tabular-nums ${total >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {total >= 0 ? "" : "-"}
                      {formatCurrency(Math.abs(total))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Net Change in Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalCash)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current cash position across all accounts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
