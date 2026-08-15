import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { isSsoEnabled, getSsoDisplayName } from "@/lib/auth/sso";

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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4 py-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold tracking-tight shadow-sm transition-transform duration-200 group-hover:scale-105">
              xbx
            </div>
            <span className="text-2xl font-bold tracking-tight">Xenboox</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-native accounting for Africa
          </p>
        </div>

        <LoginForm ssoEnabled={ssoEnabled} ssoDisplayName={ssoDisplayName} />

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
    </div>
  );
}
