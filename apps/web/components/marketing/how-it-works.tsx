import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeInUp } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section";

export type HowItWorksStep = {
  step: string;
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function HowItWorks({
  steps,
  eyebrow = "How it works",
  title,
  subtitle,
  className,
}: {
  steps: HowItWorksStep[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-border bg-paper-2/60 py-16 sm:py-20 lg:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} lead={subtitle} />

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <FadeInUp key={item.step} delay={i * 0.12}>
                <div className="relative rounded-2xl border border-border/60 bg-card p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/25">
                    {item.step}
                  </div>
                  {Icon && (
                    <Icon
                      className="mt-4 h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
