"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type StickyNavItem = {
  id: string;
  label: string;
};

export function StickyNav({
  items,
  className,
}: {
  items: StickyNavItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(item.id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 border-y border-border bg-background/80 backdrop-blur-xl",
        className,
      )}
      aria-label="Section navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeId === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
