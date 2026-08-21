"use client";

import { useState, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";

import {
  getLocale,
  setLocale,
  getAvailableLocales,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Language Selector ─────────────────────────────────────────────────────
//
// Dropdown selector for changing the platform language.
// Supports English, French, Arabic (RTL), and Spanish.

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");

  useEffect(() => {
    setCurrentLocale(getLocale());
  }, []);

  const handleSelect = (locale: Locale) => {
    setLocale(locale);
    setCurrentLocale(locale);
    setIsOpen(false);
  };

  const locales = getAvailableLocales();
  const current = locales.find((l) => l.code === currentLocale);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span>{current?.nativeName ?? "English"}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border/60 bg-card shadow-2xl py-1">
            {locales.map((locale) => (
              <button
                key={locale.code}
                type="button"
                onClick={() => handleSelect(locale.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                  currentLocale === locale.code
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{locale.nativeName}</span>
                  <span className="text-xs text-muted-foreground">
                    {locale.name}
                  </span>
                </div>
                {currentLocale === locale.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
