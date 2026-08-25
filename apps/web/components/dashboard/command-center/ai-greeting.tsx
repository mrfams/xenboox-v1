"use client";

// ─── AI Greeting ──────────────────────────────────────────────────────────
//
// Time-of-day greeting with AI status indicator. Shown at the top
// of the Command Center.

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function AIGreeting({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = DATE_FORMATTER.format(new Date());

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
        <p className="text-[11px] text-muted-foreground/70 sm:text-xs">
          Here&apos;s your business snapshot for{" "}
          <span className="font-medium text-muted-foreground">{today}</span>.
        </p>
      </div>{" "}
      <div
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 sm:flex"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-medium text-muted-foreground/60">
          AI active
        </span>
      </div>
    </div>
  );
}
