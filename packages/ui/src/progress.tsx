import * as React from "react"
import { cn } from "./lib"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: "default" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant = "default", size = "md", indicatorClassName, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-4",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out",
            variant === "default" && "bg-primary",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-yellow-500",
            variant === "danger" && "bg-red-500",
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress, type ProgressProps }
