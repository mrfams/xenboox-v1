"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Calculator,
  LineChart,
  FileSearch,
  ShieldCheck,
  UserCog,
} from "lucide-react";

export type AIMode =
  | "cfo"
  | "accountant"
  | "analyst"
  | "tax"
  | "auditor"
  | "controller";

type ModeConfig = {
  id: AIMode;
  label: string;
  icon: typeof Briefcase;
  description: string;
  color: string;
  gradient: string;
};

const MODES: ModeConfig[] = [
  {
    id: "cfo",
    label: "CFO",
    icon: Briefcase,
    description: "Strategic financial leadership",
    color: "text-signal-indigo border-signal-indigo/30 bg-signal-indigo/10",
    gradient: "from-signal-indigo to-blue-600",
  },
  {
    id: "accountant",
    label: "Accountant",
    icon: Calculator,
    description: "Day-to-day accounting tasks",
    color: "text-balanced-green border-balanced-green/30 bg-balanced-green-bg",
    gradient: "from-balanced-green to-teal-600",
  },
  {
    id: "analyst",
    label: "Analyst",
    icon: LineChart,
    description: "Deep data analysis & reports",
    color:
      "text-purple-500 border-purple-500/30 bg-purple-50 dark:bg-purple-950/20",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    id: "tax",
    label: "Tax Advisor",
    icon: FileSearch,
    description: "Tax compliance & planning",
    color:
      "text-attention-amber border-attention-amber/30 bg-attention-amber-bg",
    gradient: "from-attention-amber to-amber-600",
  },
  {
    id: "auditor",
    label: "Auditor",
    icon: ShieldCheck,
    description: "Compliance & risk review",
    color: "text-error-clay border-error-clay/30 bg-error-clay-bg",
    gradient: "from-error-clay to-rose-600",
  },
  {
    id: "controller",
    label: "Controller",
    icon: UserCog,
    description: "Close management & controls",
    color: "text-cyan-500 border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20",
    gradient: "from-cyan-500 to-blue-500",
  },
];

type CFOAIModeSwitcherProps = {
  currentMode: AIMode;
  onModeChange: (mode: AIMode) => void;
  className?: string;
};

export function CFOAIModeSwitcher({
  currentMode,
  onModeChange,
  className,
}: CFOAIModeSwitcherProps) {
  const current = MODES.find((m) => m.id === currentMode) ?? MODES[0];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === currentMode;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
              isActive
                ? mode.color + " shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
            )}
            title={mode.description}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                isActive ? "text-current" : "text-muted-foreground/40",
              )}
            />
            <span>{mode.label}</span>
            {isActive && (
              <span
                className={cn(
                  "absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r",
                  mode.gradient,
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
