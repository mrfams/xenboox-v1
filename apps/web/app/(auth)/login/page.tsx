import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { isSsoEnabled, getSsoDisplayName } from "@/lib/auth/sso";

export const metadata: Metadata = {
  title: "Sign In — Xenboox",
  description: "Sign in to your Xenboox AI-native accounting platform.",
};

/**
 * Only allow same-site, relative redirect targets. Anything else (absolute
 * URLs, protocol-relative //host, backslashes, javascript:/data: schemes) is an
 * open-redirect vector — strip it by re-rendering /login clean.
 */
function isSafeRedirect(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;

  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  return true;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Every redirect-style parameter is validated; the app only ever honors
  // same-site relative paths, so any suspicious value gets stripped by
  // re-rendering /login without it.
  const redirectParams = ["callbackUrl", "callback_url", "redirect", "next"];
  for (const key of redirectParams) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first && !isSafeRedirect(first)) {
      redirect("/login");
    }
  }

  const ssoEnabled = isSsoEnabled();
  const ssoDisplayName = getSsoDisplayName();
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  const expired = params.expired === "1";

  return (
    <div>
      {/* Mobile-only logo (hidden on lg+ since the left panel shows it) */}
      <div className="mb-8 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold tracking-tight shadow-sm transition-transform duration-200 group-hover:scale-105">
            xbx
          </div>
          <span className="text-2xl font-bold tracking-tight">Xenboox</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        }
      >
        <LoginForm
          ssoEnabled={ssoEnabled}
          ssoDisplayName={ssoDisplayName}
          callbackUrl={callbackUrl}
          expired={expired}
        />
      </Suspense>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign up free
        </Link>
      </div>
    </div>
  );
}
