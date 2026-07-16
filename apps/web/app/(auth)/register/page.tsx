import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Xenboox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-native accounting for Africa
        </p>
      </div>
      <RegisterForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Log in
        </Link>
      </div>
    </>
  )
}