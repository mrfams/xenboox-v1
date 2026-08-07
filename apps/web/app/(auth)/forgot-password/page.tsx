import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Xenboox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-native accounting for Africa
        </p>
      </div>
      <ForgotPasswordForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
