import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Pay Invoice — Xenboox",
  description: "Secure online payment for your invoice",
  robots: { index: false, follow: false },
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <div className="flex min-h-screen flex-col">
          {/* Minimal header */}
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  X
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  Xenboox
                </span>
              </div>
              <span className="text-xs text-slate-400">Secure Payment</span>
            </div>
          </header>

          {/* Main content */}
          <main className="flex flex-1 items-start justify-center p-4 pt-8 sm:pt-16">
            {children}
          </main>

          {/* Minimal footer */}
          <footer className="border-t border-slate-200 bg-white py-4">
            <p className="text-center text-xs text-slate-400">
              Powered by Xenboox — AI-Native Accounting Platform
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
