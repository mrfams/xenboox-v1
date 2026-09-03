"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { SessionExpiryModal } from "./session-expiry-modal";

const EXEMPT_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/mfa-challenge",
  "/admin-login",
  "/api/auth",
];
/** 30-second countdown before forced redirect */
const COUNTDOWN_SECONDS = 30;
/** Proactive warning: trigger modal 30s BEFORE JWT expires */
const WARNING_BEFORE_EXPIRY_MS = 30_000;

function isExempt(pathname: string | null): boolean {
  if (!pathname) return false;
  return EXEMPT_PREFIXES.some(
    (p) =>
      pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p),
  );
}

export function SessionExpiryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS);
  const wasAuthenticatedRef = React.useRef(false);
  const hasSignaledRef = React.useRef(false);
  /** Track when session was last confirmed active for proactive warning */
  const lastActiveRef = React.useRef<number>(Date.now());

  const callbackUrl = React.useMemo(() => {
    if (typeof window === "undefined") return "/dashboard";
    return window.location.pathname + window.location.search;
  }, [open, pathname]);

  const trigger = React.useCallback(() => {
    if (hasSignaledRef.current) return;
    if (isExempt(pathname)) return;
    hasSignaledRef.current = true;
    setOpen(true);
    // Cross-tab notify — cloud is still source of truth, this is only UX sync
    try {
      const bc = new BroadcastChannel("xenboox:auth");
      bc.postMessage({ type: "session-expired" });
      bc.close();
    } catch {}
  }, [pathname]);

  // 1) Session status → idle timeout invalidated JWT (server returns null → unauthenticated)
  React.useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
      hasSignaledRef.current = false;
      lastActiveRef.current = Date.now();
    }
    if (status === "unauthenticated" && wasAuthenticatedRef.current) {
      trigger();
    }
  }, [status, trigger]);

  // 2) tRPC / fetch 401 → dispatch from trpc provider or direct fetch
  React.useEffect(() => {
    const handler = () => trigger();
    window.addEventListener(
      "xenboox:session-expired",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "xenboox:session-expired",
        handler as EventListener,
      );
  }, [trigger]);

  // 3) Cross-tab sync — BroadcastChannel only (no localStorage, cloud is authority)
  React.useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("xenboox:auth");
      bc.onmessage = (e) => {
        if (e.data?.type === "session-expired") trigger();
      };
    } catch {}
    return () => {
      try {
        bc?.close();
      } catch {}
    };
  }, [trigger]);

  // 4) QueryCache UNAUTHORIZED → immediate modal (covers tRPC without wait for session poll)
  React.useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      const error = event?.query?.state?.error as unknown as
        | { data?: { code?: string }; code?: string; message?: string }
        | undefined;
      if (!error) return;
      const code = error.data?.code || error.code;
      const msg = error.message || "";
      if (
        code === "UNAUTHORIZED" ||
        msg.includes("UNAUTHORIZED") ||
        msg.includes("Not authenticated")
      ) {
        trigger();
      }
    });
    return () => unsub();
  }, [queryClient, trigger]);

  // 5) Re-check when tab becomes visible — session may have expired while hidden
  React.useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        wasAuthenticatedRef.current &&
        status === "unauthenticated"
      ) {
        trigger();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, trigger]);

  // 6) Proactive session expiry warning — poll every 30s, warn 30s before JWT dies
  React.useEffect(() => {
    if (status !== "authenticated") return;
    const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
    const check = () => {
      const elapsed = Date.now() - lastActiveRef.current;
      const remaining = SESSION_DURATION_MS - elapsed;
      if (remaining <= WARNING_BEFORE_EXPIRY_MS && remaining > 0) {
        trigger();
      }
    };
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [status, trigger]);

  // Countdown + auto-redirect
  React.useEffect(() => {
    if (!open) return;
    setCountdown(COUNTDOWN_SECONDS);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, callbackUrl, router]);

  const handleOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Dismiss keeps user on page but next data fetch will still 401 → modal again.
      // We do NOT auto-redirect on dismiss, but clear the signal so a future 401 can re-trigger.
      hasSignaledRef.current = false;
    }
  }, []);

  return (
    <>
      {children}
      {open && (
        <SessionExpiryModal
          open={open}
          onOpenChange={handleOpenChange}
          countdown={countdown}
          callbackUrl={callbackUrl}
        />
      )}
    </>
  );
}
