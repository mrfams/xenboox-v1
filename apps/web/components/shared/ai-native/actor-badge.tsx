"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Actor = "ai" | "human" | { name: string };

export function ActorBadge({
  actor,
  className,
}: {
  actor: Actor;
  className?: string;
}) {
  if (actor === "ai") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium text-primary/70",
          className,
        )}
      >
        <Bot className="h-3 w-3" aria-hidden="true" />
        AI
      </span>
    );
  }

  if (actor === "human") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60",
          className,
        )}
      >
        <User className="h-3 w-3" aria-hidden="true" />
        You
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60",
        className,
      )}
    >
      <User className="h-3 w-3" aria-hidden="true" />
      {actor.name}
    </span>
  );
}
