import { ArrowRight, CheckCircle, Loader, Shield } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Shield,
    title: "Bank-grade security",
    description:
      "AES-256 at rest, TLS 1.3 in transit, SOC 2 policies written, daily backups with 30-day retention.",
  },
  {
    icon: CheckCircle,
    title: "Audit trail for every action",
    description:
      "Who did what, when, and why — fully logged with confidence scores. Immutable, append-only, 7-year retention.",
  },
  {
    icon: Loader,
    title: "99.9% uptime SLA",
    description:
      "Multi-region deployment on Vercel with health checks, auto-healing, and real-time monitoring via Sentry and LangFuse.",
  },
];

export function TrustSection() {
  return (
    <section className="mx-auto my-20 max-w-5xl">
      <div className="mb-12 border-b border-border/50 pb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Built for businesses that can't afford mistakes
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Every feature is designed around one principle: your books must be{" "}
          <span className="text-foreground font-medium">
            categorically correct
          </span>{" "}
          — not approximately right.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-xl border border-border/50 bg-background/50 p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4" />
        <span>Read our security documentation</span>
      </div>
    </section>
  );
}
