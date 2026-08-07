"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, XCircle, Loader2, AlertCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import { trpc } from "@/lib/trpc/client";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = Array.isArray(params?.token)
    ? params.token[0]
    : (params?.token ?? "");
  const [status, setStatus] = useState<
    "loading" | "accepted" | "error" | "expired" | "requires_auth"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [prefilledEmail, setPrefilledEmail] = useState<string | null>(null);

  const acceptMutation = trpc.invitations.accept.useMutation();

  useEffect(() => {
    async function acceptInvite() {
      try {
        const result = await acceptMutation.mutateAsync({ token });
        const resultData = result as Record<string, unknown>;
        if (resultData.requiresAuth === true) {
          setPrefilledEmail((resultData.email as string | null) ?? null);
          setStatus("requires_auth");
          return;
        }
        if (resultData.entityId) {
          localStorage.setItem(
            "currentEntityId",
            resultData.entityId as string,
          );
        }
        setStatus("accepted");
        // Redirect to dashboard after brief delay
        setTimeout(() => router.push("/dashboard"), 2000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorMsg(msg);
        }
      }
    }
    acceptInvite();
  }, [token]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative w-full max-w-md px-4 py-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-sm transition-transform duration-200 group-hover:scale-105">
              X
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Xenboox
            </span>
          </Link>
        </div>

        <Card className="w-full bg-white/95 backdrop-blur-sm border-white/10 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>
              {status === "loading" && "Accepting invitation..."}
              {status === "accepted" && "Invitation accepted!"}
              {status === "expired" && "Invitation expired"}
              {status === "error" && "Something went wrong"}
              {status === "requires_auth" && "Sign in to accept"}
            </CardTitle>
            <CardDescription>
              {status === "loading" &&
                "Please wait while we process your invitation."}
              {status === "accepted" && "Redirecting you to your workspace..."}
              {status === "expired" &&
                "This invitation link is no longer valid."}
              {(status === "error" && errorMsg) ||
                "We could not process this invitation."}
              {status === "requires_auth" &&
                "Please sign in or create an account to accept this invitation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-6">
            {status === "loading" && (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            )}
            {status === "accepted" && (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
            )}
            {status === "expired" && (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-7 w-7 text-amber-500" />
              </div>
            )}
            {status === "error" && (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
            )}
            {status === "requires_auth" && (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
                <AlertCircle className="h-7 w-7 text-blue-500" />
              </div>
            )}

            {status === "requires_auth" && (
              <div className="flex w-full flex-col gap-3">
                <Button
                  onClick={() => {
                    const url = prefilledEmail
                      ? `/register?email=${encodeURIComponent(prefilledEmail)}`
                      : "/register";
                    router.push(url);
                  }}
                  className="w-full"
                >
                  Create an account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/login")}
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            )}

            {status === "expired" && (
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                Ask the person who invited you to resend the invitation.
              </p>
            )}

            {(status === "expired" || status === "error") && (
              <Button variant="outline" onClick={() => router.push("/")}>
                Go to home page
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
