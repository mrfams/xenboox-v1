import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI Accounting Insights & Updates",
  description:
    "Product updates, engineering deep-dives, and insights from the team building the future of AI-native accounting.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
