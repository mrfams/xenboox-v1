"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";

type AIGreetingProps = {
  className?: string;
};

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AIGreeting({ className }: AIGreetingProps) {
  const { data: session } = useSession();
  const firstName = useMemo(() => {
    if (!session?.user?.name) return null;
    return session.user.name.split(" ")[0];
  }, [session]);

  const greeting = getTimeBasedGreeting();

  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
        <span className="ml-2 inline-block motion-safe:animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">
          👋
        </span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening with your business today.
      </p>
    </div>
  );
}
