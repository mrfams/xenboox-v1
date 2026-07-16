"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/shared/loading"
import { trpc } from "@/lib/trpc/client"
import { useEntity } from "@/lib/entity-context"
import { formatCurrency, cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  DollarSign,
  FileText,
  CreditCard,
  Landmark,
  Wallet,
  BookOpen,
  Upload,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Clock,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type SalesInvoice = {
  id: string
  status: string
  totalAmount: string
  paidAmount: string
  balance: string
  invoiceDate: string
  invoiceNumber: string
}

type ApInvoice = {
  id: string
  status: string
  totalAmount: string
  balance: string
  invoiceDate: string
  invoiceNumber: string
}

type BankAccount = {
  id: string
  name: string
  currentBalance: string
  isActive: boolean
}

type CashAccount = {
  id: string
  name: string
  currentBalance: string
  isActive: boolean
}

type JournalEntry = {
  id: string
  entryNumber: number
  description: string
  date: string
  status: string
}

type PurchaseOrder = {
  id: string
  poNumber: string
  status: string
  totalAmount: string
  orderDate: string
}

// ─── Chart Component ──────────────────────────────────────────────────────────

type BarChartProps = {
  data: { label: string; value: number; color?: string }[]
  maxValue?: number
}

function BarChart({ data, maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {item.label}
          </span>
          <div className="w-full relative" style={{ height: "100px" }}>
            <div
              className={cn(
                "absolute bottom-0 w-full rounded-t-sm transition-all",
                item.color ?? "bg-primary"
              )}
              style={{ height: `${(item.value / max) * 100}%`, minHeight: item.value > 0 ? "2px" : "0" }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Quick Action Item ────────────────────────────────────────────────────────

type QuickActionProps = {
  label: string
  href: string
  icon: React.ElementType
}

function QuickActionItem({ label, href, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors hover:bg-accent"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {label}
    </Link>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "outline",
    pending: "secondary",
    partial: "secondary",
    paid: "default",
    overdue: "destructive",
    voided: "outline",
    submitted: "default",
    approved: "default",
    received: "default",
    cancelled: "destructive",
    posted: "default",
    pending_review: "secondary",
    reversed: "destructive",
  }

  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId } = useEntity()

  // ── Data queries ──

  const { data: arInvoices, isLoading: arLoading, error: arError } = trpc.ar.listInvoices.useQuery()
  const { data: apInvoices, isLoading: apLoading, error: apError } = trpc.ap.listInvoices.useQuery()
  const { data: poList, isLoading: poLoading, error: poError } = trpc.ap.listPOs.useQuery()
  const { data: bankAccounts, isLoading: bankLoading, error: bankError } = trpc.treasury.listBankAccounts.useQuery()
  const { data: cashAccounts, isLoading: cashLoading, error: cashError } = trpc.cash.listCashAccounts.useQuery()
  const { data: journalEntries, isLoading: journalLoading, error: journalError } = trpc.journal.list.useQuery({ limit: 5 })

  // ── Error toasts ──

  if (arError) toast.error("Failed to load receivables")
  if (apError) toast.error("Failed to load payables")
  if (poError) toast.error("Failed to load purchase orders")
  if (bankError) toast.error("Failed to load bank accounts")
  if (cashError) toast.error("Failed to load cash accounts")
  if (journalError) toast.error("Failed to load journal entries")

  const isLoading = arLoading || apLoading || poLoading || bankLoading || cashLoading || journalLoading

  // ── Derived metrics ──

  const metrics = useMemo(() => {
    const arList = (arInvoices ?? []) as SalesInvoice[]
    const apList = (apInvoices ?? []) as ApInvoice[]
    const banks = (bankAccounts ?? []) as BankAccount[]
    const cashes = (cashAccounts ?? []) as CashAccount[]
    const pos = (poList ?? []) as PurchaseOrder[]

    // Total Revenue: sum of paid invoices this month
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const totalRevenue = arList
      .filter((inv) => inv.status === "paid" && inv.invoiceDate.startsWith(thisMonth))
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0)

    // Outstanding Receivables: pending or partial
    const outstandingReceivables = arList
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .reduce((sum, inv) => sum + parseFloat(inv.balance), 0)
    const arCount = arList.filter(
      (inv) => inv.status === "pending" || inv.status === "partial"
    ).length

    // Outstanding Payables: pending or partial
    const outstandingPayables = apList
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .reduce((sum, inv) => sum + parseFloat(inv.balance), 0)
    const apCount = apList.filter(
      (inv) => inv.status === "pending" || inv.status === "partial"
    ).length

    // Cash & Bank Balance
    const bankBalance = banks
      .filter((b) => b.isActive)
      .reduce((sum, b) => sum + parseFloat(b.currentBalance), 0)
    const cashBalance = cashes
      .filter((c) => c.isActive)
      .reduce((sum, c) => sum + parseFloat(c.currentBalance), 0)
    const totalCashBank = bankBalance + cashBalance
    const accountCount = banks.filter((b) => b.isActive).length + cashes.filter((c) => c.isActive).length

    // Pending approvals: submitted POs
    const pendingPOs = pos.filter((po) => po.status === "submitted")
    const pendingApInvoices = apList.filter((inv) => inv.status === "pending")
    const totalPendingApprovals = pendingPOs.length + pendingApInvoices.length

    // Monthly revenue chart data (last 6 months)
    const monthlyRevenue: { label: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleString("en-GM", { month: "short" })
      const value = arList
        .filter((inv) => inv.status === "paid" && inv.invoiceDate.startsWith(key))
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0)
      monthlyRevenue.push({ label, value })
    }

    // Cash flow: inflow = total revenue this month, outflow = total AP paid this month
    const totalInflow = arList
      .filter((inv) => inv.status === "paid" && inv.invoiceDate.startsWith(thisMonth))
      .reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0)
    const totalOutflow = apList
      .filter((inv) => inv.status === "paid" && inv.invoiceDate.startsWith(thisMonth))
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0)

    const cashFlowData = [
      { label: "Inflow", value: totalInflow, color: "bg-emerald-500" },
      { label: "Outflow", value: totalOutflow, color: "bg-red-500" },
    ]

    return {
      totalRevenue,
      outstandingReceivables,
      arCount,
      outstandingPayables,
      apCount,
      totalCashBank,
      accountCount,
      totalPendingApprovals,
      pendingPOs,
      monthlyRevenue,
      cashFlowData,
    }
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts, poList])

  // ── Stat cards ──

  const statCards = [
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      changeLabel: "This month",
      change: null,
      href: "/dashboard/ar/invoices",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Outstanding Receivables",
      value: formatCurrency(metrics.outstandingReceivables),
      changeLabel: `${metrics.arCount} invoice${metrics.arCount !== 1 ? "s" : ""}`,
      change: null,
      href: "/dashboard/ar/invoices",
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      label: "Outstanding Payables",
      value: formatCurrency(metrics.outstandingPayables),
      changeLabel: `${metrics.apCount} bill${metrics.apCount !== 1 ? "s" : ""}`,
      change: null,
      href: "/dashboard/ap/invoices",
    },
    {
      icon: <Landmark className="h-4 w-4" />,
      label: "Cash & Bank Balance",
      value: formatCurrency(metrics.totalCashBank),
      changeLabel: `${metrics.accountCount} account${metrics.accountCount !== 1 ? "s" : ""}`,
      change: null,
      href: "/dashboard/treasury",
    },
  ]

  // ── Quick actions ──

  const quickActions: QuickActionProps[] = [
    { label: "New Journal Entry", href: "/dashboard/journal/new", icon: BookOpen },
    { label: "New Invoice", href: "/dashboard/ar/invoices", icon: FileText },
    { label: "New Bill", href: "/dashboard/ap/invoices", icon: CreditCard },
    { label: "Upload Document", href: "/dashboard/documents", icon: Upload },
    { label: "Record Payment", href: "/dashboard/treasury", icon: Send },
    { label: "Petty Cash", href: "/dashboard/cash", icon: Wallet },
  ]

  // ── Render ──

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your financial position" />

      {/* ── Row 1: Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCard key={i} icon={<Skeleton className="h-4 w-4" />} label="" value="" loading />
            ))
          : statCards.map((card) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                change={card.change}
                changeLabel={card.changeLabel}
                href={card.href}
              />
            ))}
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <BarChart data={metrics.monthlyRevenue} />
            )}
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Flow — This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <BarChart data={metrics.cashFlowData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Recent Entries, Pending Approvals, Quick Actions ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Journal Entries */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Journal Entries
              </CardTitle>
              <Link href="/dashboard/journal">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  View all
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !journalEntries || journalEntries.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No entries yet"
                description="Create your first journal entry to get started."
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {journalEntries.map((entry: JournalEntry) => (
                  <Link
                    key={entry.id}
                    href={`/dashboard/journal/${entry.id}`}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        #{entry.entryNumber} — {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>
                    <StatusBadge status={entry.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
              <Badge variant="secondary">{metrics.totalPendingApprovals}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : metrics.totalPendingApprovals === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="All clear"
                description="No pending approvals at the moment."
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {metrics.pendingPOs.map((po: PurchaseOrder) => (
                  <Link
                    key={po.id}
                    href={`/dashboard/ap/pos/${po.id}`}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">PO {po.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{po.orderDate}</p>
                    </div>
                    <StatusBadge status={po.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <QuickActionItem key={action.label} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Agent Activity ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agent Activity
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {entityId ? (
            <AgentActivityFeed entityId={entityId} />
          ) : (
            <EmptyState
              icon={<Bot className="h-8 w-8" />}
              title="No entity selected"
              description="Select an organization to see agent activity."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Agent Activity Feed ──────────────────────────────────────────────────────

function AgentActivityFeed({ entityId }: { entityId: string }) {
  // Placeholder: agent status query for health check
  const { data: agentStatus, isLoading } = trpc.agent.status.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!agentStatus) {
    return (
      <EmptyState
        icon={<Bot className="h-8 w-8" />}
        title="Agent system unavailable"
        description="Could not connect to the agent system."
        className="py-6"
      />
    )
  }

  const agents = agentStatus.agentsAvailable ?? []

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent: string) => (
        <div
          key={agent}
          className="flex items-center gap-3 rounded-lg border p-3 text-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium capitalize">{agent.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      ))}
    </div>
  )
}
