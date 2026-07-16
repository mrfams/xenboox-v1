import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import Link from "next/link"

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Xenboox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-native accounting for Africa
        </p>
      </div>
      <ResetPasswordForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Back to sign in
        </Link>
      </div>
    </>
  )
}
