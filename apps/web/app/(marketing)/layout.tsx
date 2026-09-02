"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X, Menu } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FadeInUp } from "@/components/marketing/reveal";
import { StickyCta } from "@/components/marketing/sticky-cta";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Documentation", href: "/docs" },
  { label: "Contact", href: "/contact" },
];

const footerLinks = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "One-Pager", href: "/one-pager" },
    { label: "Compare", href: "/compare" },
    { label: "Blog", href: "/blog" },
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "/docs/changelog" },
    { label: "API Reference", href: "/docs/api" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press Kit", href: "/about" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
    { label: "Refund Policy", href: "/refund" },
    { label: "SLA", href: "/sla" },
  ],
};

const socialLinks = [
  {
    label: "X / Twitter",
    href: "https://twitter.com/xenboox",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/xenboox",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/mrfams/xenboox",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@xenboox",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
        setEmail("");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-balanced-green/15">
          <svg
            className="h-5 w-5 text-balanced-green"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="text-sm font-medium text-foreground">You're all set!</p>
        <p className="text-xs text-paper/50">
          Check your inbox for a welcome email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex w-full max-w-lg mx-auto flex-col gap-3"
    >
      <div className="flex gap-2.5 flex-col sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            aria-label="Email address"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-paper placeholder-paper/30 outline-none transition-all duration-200 focus:border-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Subscribing…
            </>
          ) : (
            <>
              Subscribe
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
      <p className="text-center text-[11px] text-paper/30">
        Free forever · No credit card required · Unsubscribe anytime
      </p>
    </form>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json().catch(() => null))
      .then((data) => setIsLoggedIn(!!data?.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm"
            : "border-b border-transparent bg-background"
        }`}
      >
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo
              size={32}
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-lg font-bold tracking-tight">Xenboox</span>
          </Link>

          {/* Desktop Nav */}
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

          {/* Desktop Auth */}
          <div className="hidden sm:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-md"
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
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-md"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border/50 bg-background">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/50 mt-3 space-y-2">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                      Sign Up Free
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center h-10 rounded-lg border px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Skip link — first tab stop jumps past the marketing nav to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-gradient-to-b from-background to-paper-2/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Newsletter — professional standalone section */}
          <FadeInUp duration={0.4}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ledger-ink via-ledger-ink to-ledger-ink-2 p-8 sm:p-10 mb-10">
              {/* Decorative background elements */}
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-balanced-green/10 blur-3xl" />
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>

              <div className="relative mx-auto max-w-xl text-center">
                <h3 className="text-2xl font-bold tracking-tight text-paper sm:text-3xl">
                  Stay in the loop
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/50 max-w-md mx-auto">
                  Product updates, accounting best practices, and industry
                  insights. Delivered bi-weekly.
                </p>

                <FooterNewsletterForm />
              </div>
            </div>
          </FadeInUp>

          {/* Links */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12">
            {/* Brand */}
            <FadeInUp delay={0} className="lg:col-span-4">
              <Link href="/" className="flex items-center gap-2.5 group">
                <Logo size={32} />
                <span className="text-lg font-bold">Xenboox</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                AI-native accounting platform built for businesses. Automated
                journal entries, reconciliations, payroll, and financial
                reporting — all in one place.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:border-foreground/20 transition-all duration-200"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </FadeInUp>

            {/* Product */}
            <FadeInUp delay={0.08} className="lg:col-span-2 lg:col-start-7">
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Product
              </h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
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
            </FadeInUp>

            {/* Company */}
            <FadeInUp delay={0.16} className="lg:col-span-2">
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Company
              </h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
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
            </FadeInUp>

            {/* Legal */}
            <FadeInUp delay={0.24} className="lg:col-span-2">
              <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Legal
              </h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
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
            </FadeInUp>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Xenboox. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <Link
                href="/privacy"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/cookies"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
      <StickyCta />
    </div>
  );
}
