"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  BookOpen,
  Briefcase,
  Sparkles,
  Check,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboarding, type OnboardingStep } from "@/lib/hooks/use-onboarding"

// ─── Navigation Items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Books", href: "/dashboard/journal", icon: BookOpen },
  { label: "More", href: "/dashboard/settings", icon: Briefcase },
]

// ─── Onboarding Steps Config ─────────────────────────────────────────────────

const ONBOARDING_STEPS: { key: OnboardingStep; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "chart-of-accounts", label: "Chart of Accounts" },
  { key: "bank-connection", label: "Bank Connection" },
  { key: "team", label: "Team Setup" },
  { key: "ai-preferences", label: "AI Preferences" },
]

// ─── Mobile Bottom Nav Component ──────────────────────────────────────────────

export function MobileBottomNav() {
  const pathname = usePathname()
  const { isFirstTime, currentStep, stepIndex, totalSteps, isLoaded } = useOnboarding()

  const pct = Math.round((stepIndex / totalSteps) * 100)
  const showOnboarding = isLoaded && isFirstTime

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Onboarding Progress (above nav) */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-t px-4 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Setup</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1">
              {ONBOARDING_STEPS.map((step, i) => (
                <div
                  key={step.key}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    i < stepIndex
                      ? "bg-primary"
                      : i === stepIndex
                        ? "bg-primary w-3"
                        : "bg-primary/20"
                  )}
                />
              ))}
            </div>
            <Link
              href="/dashboard/settings"
              className="text-[10px] text-primary font-medium"
            >
              {stepIndex === 0 ? "Start" : "Continue"} →
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="flex items-center justify-around border-t bg-card px-2 py-1 safe-area-inset-bottom"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors min-w-[48px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive && "text-primary"
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
