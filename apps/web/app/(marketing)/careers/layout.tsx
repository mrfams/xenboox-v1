import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers at Xenboox — Build AI-Native Accounting | Open Roles",
  description:
    "Join the Xenboox team building AI-native accounting. Engineering, product, design, and customer success roles available.",
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
