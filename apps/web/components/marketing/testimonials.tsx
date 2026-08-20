import { Quote, Star } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const testimonials = [
  {
    quote:
      "We closed our first month in four days. Previously it took three weeks and two accountants. The close checklist alone is worth the subscription.",
    name: "Fatoumata Ceesay",
    role: "CFO, Seagull Logistics",
    location: "Banjul",
    initials: "FC",
    featured: true,
  },
  {
    quote:
      "The agents chased down GMD 1.8M in overdue invoices while we slept. I just reviewed and approved the follow-ups over breakfast.",
    name: "Musa Jallow",
    role: "Founder, SunuFresh Foods",
    location: "Serekunda",
    initials: "MJ",
    featured: false,
  },
];

export function Testimonials() {
  return (
    <Section id="testimonials" className="bg-paper-2/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading title="Trusted by teams who closed faster than ever." />
        </FadeInUp>

        <div className="mx-auto mt-10 sm:mt-14 grid max-w-5xl gap-5 sm:gap-6 lg:grid-cols-2">
          {testimonials.map((item, index) => (
            <FadeInUp key={item.name} delay={index * 0.12}>
              <figure
                className={`relative flex h-full flex-col rounded-2xl border border-border p-6 sm:p-8 lg:p-10 ${
                  item.featured ? "bg-card" : "bg-card"
                }`}
              >
                <Quote
                  className={`h-10 w-10 ${item.featured ? "text-primary" : "text-primary/40"}`}
                  aria-hidden="true"
                />
                <div
                  className="mt-4 flex gap-0.5"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 fill-attention-amber text-attention-amber"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-foreground">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {item.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.role} · {item.location}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </FadeInUp>
          ))}
        </div>
      </div>
    </Section>
  );
}
