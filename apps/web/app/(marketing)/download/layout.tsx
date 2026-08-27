import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Xenboox — Free AI Accounting App | Web, Mobile",
  description:
    "Download Xenboox for free. AI-native accounting on web, iOS, and Android. Start closing your books in days, not weeks.",
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
