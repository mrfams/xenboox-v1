import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      {/* Mobile-only logo */}
      <div className="mb-8 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold tracking-tight shadow-sm transition-transform duration-200 group-hover:scale-105">
            xbx
          </div>
          <span className="text-2xl font-bold tracking-tight">Xenboox</span>
        </Link>
      </div>

      <ForgotPasswordForm />

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
