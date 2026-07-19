"use client"

import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  className?: string
  indicatorClassName?: string
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  return (
    <div className={cn("w-full bg-muted rounded-full h-2", className)}>
      <div
        className={cn("h-full bg-primary rounded-full transition-all duration-300", indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

interface AlertProps {
  children: React.ReactNode
  className?: string
}

export function Alert({ children, className }: AlertProps) {
  return (
    <div className={cn("p-4 rounded-lg border", className || "")}>
      {children}
    </div>
  )
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-sm">{children}</div>
}
