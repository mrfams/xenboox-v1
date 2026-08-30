"use client";

import * as React from "react";
import { Bot, CalendarCheck, FileSearch, ShieldCheck } from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

const stats = [
  {
    icon: Bot,
    target: 20,
    suffix: "",
    label: "Specialized agents",
    description: "Each built for one job",
  },
  {
    icon: CalendarCheck,
    target: 4,
    suffix: " day",
    label: "Month-end close",
    description: "Down from 3 weeks",
  },
  {
    icon: FileSearch,
    target: 0,
    suffix: "",
    label: "Late filings",
    description: "Compliance on autopilot",
  },
  {
    icon: ShieldCheck,
    target: 100,
    suffix: "%",
    label: "Audit-trailed",
    description: "Every action recorded",
  },
];

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || target === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic for a smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, value };
}

function StatItem({ stat }: { stat: (typeof stats)[number] }) {
  const { ref, value } = useCountUp(stat.target);
  const Icon = stat.icon;

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-3 text-center lg:px-6 first:lg:pl-0 last:lg:pr-0"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors duration-300 group-hover:bg-primary/12">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
          {stat.target === 0 ? 0 : value}
          {stat.suffix && <span className="text-primary">{stat.suffix}</span>}
        </span>
        <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {stat.description}
        </p>
      </div>
    </div>
  );
}

export function StatBar() {
  return (
    <section
      className="relative border-y border-border/60 bg-paper py-10 sm:py-12"
      aria-label="Platform statistics"
    >
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(59,79,224,0.04), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:divide-x lg:divide-border/60">
            {stats.map((stat) => (
              <StatItem key={stat.label} stat={stat} />
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
