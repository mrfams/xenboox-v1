import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Migrate to Xenboox — Switch from QuickBooks, Xero | Free Migration",
  description:
    "Switch to Xenboox from QuickBooks, Xero, or spreadsheets. Free migration with AI-assisted chart of accounts import. Setup in minutes.",
};

export default function MigrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
