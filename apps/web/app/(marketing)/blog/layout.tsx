import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest news, insights, and updates from the Xenboox team.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
