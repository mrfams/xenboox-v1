import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press & Media — Xenboox News, Brand Assets, Media Kit",
  description:
    "Xenboox press resources — brand assets, logos, media kit, and latest news. For press inquiries, contact press@xenboox.com.",
};

export default function PressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
