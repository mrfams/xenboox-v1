"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function useInViewOnce(ref: React.RefObject<Element | null>, margin = "-80px") {
  const [isInView, setIsInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);

  return isInView;
}

export function FadeInUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInViewOnce(ref);
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView
          ? "translateY(0) blur(0)"
          : "translateY(24px) blur(4px)",
        transition:
          "opacity 0.7s cubic-bezier(0.32, 0.72, 0, 1), transform 0.7s cubic-bezier(0.32, 0.72, 0, 1)",
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export function StaggerChildren({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInViewOnce(ref);
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ opacity: isInView ? 1 : 0, transition: "opacity 0.3s ease-out" }}
    >
      {isInView ? children : null}
    </div>
  );
}
