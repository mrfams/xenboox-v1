"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui";

const CONSENT_KEY = "xenboox-cookie-consent";

type ConsentValue = "essential-only" | "analytics" | "dismissed";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no consent has been recorded
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAccept = (value: ConsentValue) => {
    localStorage.setItem(CONSENT_KEY, value);
    try {
      const posthog = (
        window as unknown as {
          posthog?: {
            opt_out_capturing: () => void;
            opt_in_capturing: () => void;
          };
        }
      ).posthog;
      if (value === "analytics") posthog?.opt_in_capturing();
      else posthog?.opt_out_capturing();
    } catch {
      // Intentional: storage/parsing failures fall through to defaults
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies for authentication and session management.
          Analytics cookies are optional and require your consent.{" "}
          <a href="/cookies" className="underline hover:text-foreground">
            Learn more
          </a>
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="underline hover:text-foreground"
          >
            Manage
          </button>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAccept("essential-only")}
          >
            Essential Only
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAccept("analytics")}
          >
            Accept Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
