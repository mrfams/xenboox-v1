/**
 * Bills View — Real bill management with AI insights.
 *
 * Features:
 * - List of AP bills with status
 * - Filter by status (pending, overdue, paid)
 * - Search by invoice number
 * - AI payment schedule recommendation
 * - Actions (view, pay, remind)
 */

"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Input } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import {
  Search,
  Filter,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Eye,
  Loader2,
  TrendingDown,
} from "lucide-react";
import { cn } from "@xenboox/ui";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type BillStatus = "all" | "pending" | "overdue" | "paid";

interface Bill {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  balance: number;
  status: string;
  supplierName: string | null;
  supplierId: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────

export function BillsView() {
  const { entityId } = useEntity();
  const [status, setStatus] = useState<BillStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch bills
  const { data, isLoading, refetch } = trpc.bills.listBills.useQuery(
    {
      status,
      search: search || undefined,
      limit,
      offset: page * limit,
    },
    { enabled: !!entityId },
  );

  // Get summary stats
  const { data: stats } = trpc.bills.getBillsTrend.useQuery(undefined, {
    enabled: !!entityId,
  });

  const bills = data?.bills ?? [];
  const totalCount = data?.totalCount ?? 0;

  // Calculate summary from bills
  const totalOutstanding = bills
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + (b.balance ?? b.totalAmount), 0);

  const overdueCount = bills.filter((b) => b.status === "overdue").length;
  const pendingCount = bills.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalOutstanding)}
                </div>
                <div className="text-xs text-muted-foreground">Outstanding</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overdueCount}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as BillStatus);
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue
              {overdueCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bills List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bills found</p>
            </div>
          ) : (
            <div className="divide-y">
              {bills.map((bill) => (
                <BillRow key={bill.id} bill={bill} onRefresh={refetch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1}–
            {Math.min((page + 1) * limit, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bill Row ─────────────────────────────────────────────────────────────

function BillRow({ bill, onRefresh }: { bill: Bill; onRefresh: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case "partial":
        return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Days until due
  const getDaysUntilDue = () => {
    if (!bill.dueDate) return null;
    const due = new Date(bill.dueDate);
    const now = new Date();
    const diff = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{bill.invoiceNumber}</p>
            {getStatusBadge(bill.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bill.supplierName ?? "Unknown vendor"} • {bill.invoiceDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Amount */}
        <div className="text-right">
          <p className="font-medium text-sm">
            {formatCurrency(bill.totalAmount)}
          </p>
          {bill.balance !== bill.totalAmount && (
            <p className="text-xs text-muted-foreground">
              Balance: {formatCurrency(bill.balance)}
            </p>
          )}
        </div>

        {/* Due date */}
        {daysUntilDue !== null && (
          <div className="text-right w-20">
            <p
              className={cn(
                "text-sm",
                daysUntilDue < 0
                  ? "text-red-600 font-medium"
                  : daysUntilDue <= 7
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
            >
              {daysUntilDue < 0
                ? `${Math.abs(daysUntilDue)}d overdue`
                : daysUntilDue === 0
                  ? "Due today"
                  : `${daysUntilDue}d`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
          {bill.status !== "paid" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
