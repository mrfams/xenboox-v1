"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  X,
  ChevronRight,
  Send,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Badge } from "@/components/ui";

type Insight = {
  id: string;
  type: "warning" | "success" | "info" | "error";
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
};

type SuggestedAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
};

type QuickAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
};

interface AICopilotSidebarProps {
  title?: string;
  subtitle?: string;
  insights?: Insight[];
  suggestedActions?: SuggestedAction[];
  quickActions?: QuickAction[];
  onClose?: () => void;
  className?: string;
}

const insightIcons = {
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  info: <Lightbulb className="h-4 w-4 text-primary" />,
  error: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

const insightBg = {
  warning: "bg-amber-50 border-amber-200",
  success: "bg-emerald-50 border-emerald-200",
  info: "bg-primary/5 border-primary/20",
  error: "bg-destructive/5 border-destructive/20",
};

export function AICopilotSidebar({
  title = "Xenboox AI Copilot",
  subtitle,
  insights = [],
  suggestedActions = [],
  quickActions = [],
  onClose,
  className,
}: AICopilotSidebarProps) {
  const [chatInput, setChatInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("flex flex-col h-full border-l bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Beta
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3 transition-all hover:shadow-sm",
                  insightBg[insight.type],
                )}
              >
                <div className="flex items-start gap-2">
                  {insightIcons[insight.type]}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <button
                        onClick={insight.action.onClick}
                        className="mt-2 text-xs font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {insight.action.label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Suggested Actions
            </p>
            <div className="space-y-1">
              {suggestedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="flex items-center gap-2 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button size="icon" className="h-9 w-9 rounded-lg">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
