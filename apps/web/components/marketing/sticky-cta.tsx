"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";

export function StickyCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };

    const wasDismissed = sessionStorage.getItem("sticky-cta-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("sticky-cta-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(20,33,61,0.08)]">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 sm:h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <span
                className="h-2 w-2 rounded-full bg-primary animate-pulse"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                Start your free trial
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/onboarding">
                Start free
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
