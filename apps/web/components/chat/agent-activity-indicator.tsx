"use client"

import { cn } from "@/lib/utils"

type AgentActivity = {
  agentId?: string
  tier?: string
  action: string
  detail?: string
  confidence?: number
  durationMs?: number
}

type AgentActivityIndicatorProps = {
  activity: AgentActivity | null
  className?: string
}

const TIER_LABELS: Record<string, string> = {
  tier1: "Strategic",
  tier2: "Management",
  tier3: "Worker",
  platform: "Platform",
}

export function AgentActivityIndicator({
  activity,
  className,
}: AgentActivityIndicatorProps) {
  if (!activity) return null

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm",
        className,
      )}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{activity.agentId ?? "Agent"}</span>
          {activity.tier && (
            <span className="text-[10px] text-muted-foreground">
              {TIER_LABELS[activity.tier] ?? activity.tier}
            </span>
          )}
          <span className="text-muted-foreground">—</span>
          <span className="capitalize text-muted-foreground">{activity.action}</span>
        </div>
        {activity.detail && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {activity.detail}
          </p>
        )}
      </div>

      {activity.confidence != null && (
        <span className="text-xs text-muted-foreground shrink-0">
          {(activity.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}
