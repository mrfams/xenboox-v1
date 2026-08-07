"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg border bg-muted p-0.5",
        className,
      )}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7",
            theme === value && "bg-background text-foreground shadow-sm",
          )}
          onClick={() => setTheme(value)}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
