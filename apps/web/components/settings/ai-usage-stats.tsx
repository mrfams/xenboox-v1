"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import {
  BarChart3,
  Brain,
  Zap,
  AlertCircle,
  Mail,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageStats = {
  autoReconcile: number
  autoCategorize: number
  aiAlerts: number
  dailyDigest: number
  totalActions: number
  lastUsed: string | null
}

type UsageFeature = {
  key: keyof Omit<UsageStats, "totalActions" | "lastUsed">
  label: string
  description: string
  icon: React.ElementType
  color: string
}

// ─── localStorage Key ─────────────────────────────────────────────────────────

const USAGE_KEY = "xenboox_ai_usage_stats"

// ─── Default Stats ────────────────────────────────────────────────────────────

const DEFAULT_STATS: UsageStats = {
  autoReconcile: 0,
  autoCategorize: 0,
  aiAlerts: 0,
  dailyDigest: 0,
  totalActions: 0,
  lastUsed: null,
}

// ─── Feature Config ───────────────────────────────────────────────────────────

const FEATURES: UsageFeature[] = [
  {
    key: "autoReconcile",
    label: "Auto-Reconciliation",
    description: "Bank transactions matched to journal entries",
    icon: Zap,
    color: "text-emerald-500",
  },
  {
    key: "autoCategorize",
    label: "Smart Categorization",
    description: "Transactions categorized by AI",
    icon: Brain,
    color: "text-blue-500",
  },
  {
    key: "aiAlerts",
    label: "Anomaly Alerts",
    description: "Unusual patterns detected",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  {
    key: "dailyDigest",
    label: "Daily Digest",
    description: "Morning summaries generated",
    icon: Mail,
    color: "text-purple-500",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStoredStats(): UsageStats {
  if (typeof window === "undefined") return DEFAULT_STATS
  try {
    const stored = localStorage.getItem(USAGE_KEY)
    if (stored) {
      return { ...DEFAULT_STATS, ...JSON.parse(stored) }
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_STATS
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIUsageStats() {
  const [stats, setStats] = useState<UsageStats>(DEFAULT_STATS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setStats(getStoredStats())
    setIsLoaded(true)
  }, [])

  if (!isLoaded) return null

  const maxUsage = Math.max(
    ...FEATURES.map((f) => stats[f.key]),
    1
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          AI Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox
            label="Total AI Actions"
            value={formatNumber(stats.totalActions)}
            icon={<Zap className="h-4 w-4 text-primary" />}
          />
          <StatBox
            label="Features Active"
            value={`${FEATURES.filter((f) => stats[f.key] > 0).length}/${FEATURES.length}`}
            icon={<Brain className="h-4 w-4 text-blue-500" />}
          />
          <StatBox
            label="Last Used"
            value={timeAgo(stats.lastUsed)}
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          />
        </div>

        {/* Feature breakdown */}
        <div className="space-y-3">
          {FEATURES.map((feature) => {
            const count = stats[feature.key]
            const pct = maxUsage > 0 ? (count / maxUsage) * 100 : 0
            const Icon = feature.icon
            return (
              <div key={feature.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5", feature.color)} />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatNumber(count)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", feature.color.replace("text-", "bg-"))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Usage tip */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Usage stats are stored locally on this device. 
            Reset All Settings to clear these counters.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  )
}

// ─── Features Config ──────────────────────────────────────────────────────────

const FEATURES: UsageFeature[] = [
  {
    key: "autoReconcile",
    label: "Auto-Reconciliation",
    description: "Bank transactions matched to journal entries",
    icon: Zap,
    color: "text-emerald-500",
  },
  {
    key: "autoCategorize",
    label: "Smart Categorization",
    description: "Expenses categorized based on history",
    icon: Brain,
    color: "text-blue-500",
  },
  {
    key: "aiAlerts",
    label: "Anomaly Alerts",
    description: "Unusual transactions flagged",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  {
    key: "dailyDigest",
    label: "Daily Digest",
    description: "Financial summaries delivered",
    icon: Mail,
    color: "text-purple-500",
  },
]
