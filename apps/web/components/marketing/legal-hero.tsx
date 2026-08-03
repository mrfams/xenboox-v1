import { FadeInUp } from "@/components/marketing/reveal";

type LegalHeroProps = {
  title: string;
  description: string;
};

export function LegalHero({ title, description }: LegalHeroProps) {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <FadeInUp>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Legal
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-muted-foreground">{description}</p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}

type LegalContentProps = {
  children: React.ReactNode;
};

export function LegalContent({ children }: LegalContentProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <FadeInUp delay={0.1}>
          <div className="prose prose-slate max-w-none">{children}</div>
        </FadeInUp>
      </div>
    </section>
  );
}
