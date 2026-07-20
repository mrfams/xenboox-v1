import Link from "next/link";
import { auth } from "@/lib/auth";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Download", href: "/download" },
  { label: "Contact", href: "/contact" },
];

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isLoggedIn = false;
  try {
    const session = await auth();
    isLoggedIn = !!session?.user;
  } catch {
    isLoggedIn = false;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm transition-transform duration-200 group-hover:scale-105">
              X
            </div>
            <span className="text-lg font-bold tracking-tight">Xenboox</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-muted-foreground rounded-lg transition-colors duration-200 hover:text-foreground hover:bg-accent/50"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-700"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-700"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm">
                  X
                </div>
                <span className="text-lg font-bold">Xenboox</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                AI-native accounting platform built for African businesses.
                Automated journal entries, reconciliations, payroll, and
                financial reporting.
              </p>
              <div className="mt-6 flex items-center gap-4">
                {[
                  { label: "Twitter/X", href: "#" },
                  { label: "LinkedIn", href: "#" },
                  { label: "GitHub", href: "#" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/30 hover:decoration-foreground/50"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Product
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "/features" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Download", href: "/download" },
                  { label: "Documentation", href: "/docs" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "About", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Careers", href: "/careers" },
                  { label: "Contact", href: "/contact" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Legal
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Privacy", href: "/privacy" },
                  { label: "Terms", href: "/terms" },
                  { label: "Cookies", href: "/cookies" },
                  { label: "Refund Policy", href: "/refund" },
                  { label: "SLA", href: "/sla" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Xenboox. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with care for African businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
