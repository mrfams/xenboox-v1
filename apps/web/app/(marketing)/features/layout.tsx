import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Discover the powerful features of Xenboox - AI automation, financial reporting, multi-currency support, and enterprise-grade security.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
