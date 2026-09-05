"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, HelpCircle, X, Command } from "lucide-react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

export function KeyboardShortcuts() {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const onCmdK = useCallback(() => setPaletteOpen((v) => !v), []);
  const onCmdN = useCallback(
    () => router.push("/dashboard/operations/invoices"),
    [router],
  );
  const onHelp = useCallback(() => setHelpOpen((v) => !v), []);

  useKeyboardShortcuts({
    "cmd+k": onCmdK,
    "cmd+n": onCmdN,
    "?": onHelp,
  });

  return (
    <>
      {/* Command palette stub */}
      {paletteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-foreground/40 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            aria-label="Close command palette"
            onClick={() => setPaletteOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                autoFocus
                placeholder="Search surfaces, ledger, help..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPaletteOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {[
                { label: "Go to Ledger", href: "/dashboard/ledger" },
                { label: "Go to Operations", href: "/dashboard/operations" },
                {
                  label: "Go to Tasks",
                  href: "/dashboard/tasks",
                },
                {
                  label: "Go to Financial Pulse",
                  href: "/dashboard/financial-pulse",
                },
                {
                  label: "New invoice",
                  href: "/dashboard/operations/invoices",
                },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setPaletteOpen(false);
                    router.push(item.href);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Command className="h-3.5 w-3.5 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help dialog */}
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            aria-label="Close help"
            onClick={() => setHelpOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> Keyboard
                shortcuts
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setHelpOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Search</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                    ⌘ K
                  </kbd>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">New invoice</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                    ⌘ N
                  </kbd>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Help</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                    ?
                  </kbd>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Toggle AI panel</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                    /
                  </kbd>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
