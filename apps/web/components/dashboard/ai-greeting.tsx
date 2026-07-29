"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Bot, Sparkles, Clock } from "lucide-react";

type AIGreetingProps = {
  className?: string;
};

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getLastReviewed(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  if (minutes < 5) return "just now";
  if (minutes < 15) return "a few minutes ago";
  if (minutes < 30) return `${Math.floor(minutes / 5) * 5} minutes ago`;
  return `${Math.floor(minutes / 10) * 10} minutes ago`;
}

export function AIGreeting({ className }: AIGreetingProps) {
  const { data: session } = useSession();
  const firstName = useMemo(() => {
    if (!session?.user?.name) return null;
    return session.user.name.split(" ")[0];
  }, [session]);

  const greeting = getTimeBasedGreeting();
  const lastReviewed = getLastReviewed();

  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
        <span className="ml-1.5 inline-block motion-safe:animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">
          👋
        </span>
      </h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bot className="h-4 w-4 text-signal-indigo" />
        <span>
          Your AI accountant reviewed your business{" "}
          <span className="font-medium text-foreground/80">{lastReviewed}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-balanced-green">
          <span className="h-1.5 w-1.5 rounded-full bg-balanced-green motion-safe:animate-pulse" />
          AI Active
        </span>
      </div>
    </div>
  );
}
