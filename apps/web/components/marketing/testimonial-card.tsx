import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  plan?: string;
  rating?: number;
};

export function TestimonialCard({
  testimonial,
  className,
  showRating = true,
  showPlan = true,
}: {
  testimonial: Testimonial;
  className?: string;
  showRating?: boolean;
  showPlan?: boolean;
}) {
  return (
    <figure
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-border/40",
        className,
      )}
    >
      {showRating && testimonial.rating && (
        <div
          className="flex items-center gap-1 mb-4"
          aria-label={`${testimonial.rating} out of 5 stars`}
        >
          {Array.from({ length: testimonial.rating }).map((_, j) => (
            <Star
              key={j}
              className="h-4 w-4 fill-attention-amber text-attention-amber"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
        <div>
          <cite className="block text-sm font-semibold not-italic text-foreground">
            {testimonial.name}
          </cite>
          <span className="block text-xs text-muted-foreground">
            {testimonial.role}
          </span>
        </div>
        {showPlan && testimonial.plan && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {testimonial.plan}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
