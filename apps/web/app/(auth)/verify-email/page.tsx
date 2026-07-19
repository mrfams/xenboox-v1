"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Button } from "@/components/ui"
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useEffect, useState } from "react"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setStatus("success")
      setMessage(data.message)
    },
    onError: (error) => {
      setStatus("error")
      setMessage(error.message)
    },
  })

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token })
    } else {
      setStatus("error")
      setMessage("No verification token provided")
    }
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
              <CardTitle className="mt-4">Verifying your email...</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="mt-4">Email Verified!</CardTitle>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="mt-4">Verification Failed</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <p className="text-sm text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          )}
          {status === "success" && (
            <>
              <p className="text-sm text-muted-foreground">
                {message} You can now access all features of Xenboox.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Go to Settings to Resend
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
              <CardTitle className="mt-4">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
