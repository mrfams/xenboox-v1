"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function StickyCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling 400px (past most heroes)
      setVisible(window.scrollY > 400);
    };

    // Check if user dismissed this session
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
      {/* Backdrop blur bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 sm:h-16 gap-4">
          {/* Left: message */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 shrink-0">
              <span className="text-lg" aria-hidden="true">
                🚀
              </span>
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

          {/* Right: CTA + dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-700"
            >
              Sign Up Free
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
