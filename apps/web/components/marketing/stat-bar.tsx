import { FadeInUp } from "@/components/marketing/reveal";

const stats = [
  { value: "19", label: "specialized agents", suffix: "" },
  { value: "4", label: "day month-end close", suffix: "" },
  { value: "0", label: "late filings", suffix: "" },
  { value: "100", label: "audit-trailed", suffix: "%" },
];

export function StatBar() {
  return (
    <section
      className="relative border-y border-border bg-paper"
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 py-5 sm:py-6 px-4 sm:px-6"
              >
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-primary">{stat.suffix}</span>
                  )}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
