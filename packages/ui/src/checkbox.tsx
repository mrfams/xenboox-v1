"use client";

import * as React from "react";
import { cn } from "./lib";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onCheckedChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <span className="relative inline-flex items-center justify-center">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className={cn(
          "peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground",
          className,
        )}
        {...props}
      />
      {checked && (
        <svg
          className="pointer-events-none absolute h-3 w-3 fill-current text-primary-foreground"
          viewBox="0 0 12 12"
        >
          <path
            d="M3 6l2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      )}
    </span>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
