import { cn } from "@/lib/utils"

type BadgeIntent = "default" | "success" | "warning" | "danger" | "info" | "muted"

const badgeClasses: Record<BadgeIntent, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  muted: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export function badgeIntent(intent: BadgeIntent, className?: string): string {
  return cn(badgeClasses[intent], className)
}

const STATUS_INTENT_MAP: Record<string, BadgeIntent> = {
  // Generic
  active: "success",
  inactive: "muted",
  draft: "muted",
  // AP/AR
  pending: "warning",
  partially_paid: "info",
  partial: "info",
  paid: "success",
  overdue: "danger",
  voided: "muted",
  // PO
  submitted: "info",
  approved: "success",
  received: "success",
  cancelled: "danger",
  // Journal
  pending_review: "warning",
  posted: "success",
  reversed: "danger",
  // Cash
  settled: "info",
  expired: "warning",
  // Fixed assets
  disposed: "danger",
  fully_depreciated: "info",
  under_maintenance: "warning",
  // Fiscal
  open: "success",
  closed: "warning",
  locked: "danger",
  // Documents
  uploaded: "info",
  processing: "warning",
  processed: "success",
  failed: "danger",
  archived: "muted",
  // Mobile money
  successful: "success",
  timeout: "muted",
  // Payroll
  validated: "info",
  // Reconciliation
  unmatched: "warning",
  matched: "success",
  disputed: "danger",
}

export function statusBadgeClass(status: string, className?: string): string {
  const intent = STATUS_INTENT_MAP[status] ?? "default"
  return cn(badgeClasses[intent], className)
}
