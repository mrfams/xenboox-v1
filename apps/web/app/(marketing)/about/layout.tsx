import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Xenboox — AI-Native Accounting Platform",
  description:
    "Learn about Xenboox — our mission to give every business a world-class finance team through AI agents that handle invoicing, payroll, and compliance.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
