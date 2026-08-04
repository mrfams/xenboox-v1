import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Xenboox team and help build the future of accounting.",
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
