"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Now onboarding early teams — white-glove migration included.{" "}
          <a
            href="/register"
            className="underline underline-offset-2 hover:no-underline font-semibold"
          >
            Get early access →
          </a>
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
