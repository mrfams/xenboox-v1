"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      aria-label="Download one-pager"
      onClick={() => window.print()}
      className="inline-flex h-12 items-center rounded-full border border-border bg-card px-8 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
    >
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      Download one-pager
    </button>
  );
}
