"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { IDLE_TIMEOUT_MS } from "@/lib/auth/idle-session";

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
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS);
  const [expired, setExpired] = React.useState(false);
  const wasAuthenticatedRef = React.useRef(false);
  const hasSignaledRef = React.useRef(false);
  const hardRedirectingRef = React.useRef(false);

  const callbackUrl = React.useMemo(() => {
    if (typeof window === "undefined") return "/dashboard";
    return window.location.pathname + window.location.search;
  }, [open, pathname]);

  const hardRedirect = React.useCallback(
    async (reason: string) => {
      if (hardRedirectingRef.current) return;
      hardRedirectingRef.current = true;
      // Clear tRPC/React-Query caches so no stale financial data survives logout.
      try {
        queryClient.clear();
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      try {
        localStorage.removeItem("currentEntityId");
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      // Cross-tab notify — cloud is still source of truth, this is only UX sync.
      try {
        const bc = new BroadcastChannel("xenboox:auth");
        bc.postMessage({ type: "session-expired", reason });
        bc.close();
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      try {
        localStorage.setItem("xenboox:session-expired-at", String(Date.now()));
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      // Clear the stale JWT cookie before navigating — otherwise /login
      // bounces back to /dashboard (middleware sees isLoggedIn=true).
      try {
        await signOut({ redirect: false });
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&expired=1`;
      router.replace(loginUrl);
    },
    [callbackUrl, queryClient, router],
  );

  const trigger = React.useCallback(
    (nextExpired: boolean) => {
      if (hasSignaledRef.current) {
        // If already showing as warning but now hard-expired, upgrade to expired.
        if (nextExpired && !expired) setExpired(true);
        return;
      }
      if (isExempt(pathname)) return;
      hasSignaledRef.current = true;
      setExpired(nextExpired);
      setOpen(true);
      // Cross-tab notify — cloud is still source of truth, this is only UX sync
      try {
        const bc = new BroadcastChannel("xenboox:auth");
        bc.postMessage({ type: "session-expired" });
        bc.close();
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
    },
    [pathname, expired],
  );

  // 1) Session status → idle timeout invalidated JWT (server returns null → unauthenticated)
  React.useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
      hasSignaledRef.current = false;
      setExpired(false);
      hardRedirectingRef.current = false;
    }
    if (status === "unauthenticated" && wasAuthenticatedRef.current) {
      trigger(true);
    }
  }, [status, trigger]);

  // 2) tRPC / fetch 401 → dispatch from trpc provider or direct fetch
  React.useEffect(() => {
    const handler = () => trigger(true);
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

  // 3) Cross-tab sync — BroadcastChannel + storage fallback (cloud is authority)
  React.useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("xenboox:auth");
      bc.onmessage = (e) => {
        if (e.data?.type === "session-expired") trigger(true);
      };
    } catch {
      // Intentional: storage/parsing failures fall through to defaults
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "xenboox:session-expired-at" && e.newValue) trigger(true);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      try {
        bc?.close();
      } catch {
        // Intentional: storage/parsing failures fall through to defaults
      }
      window.removeEventListener("storage", onStorage);
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
        trigger(true);
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
        trigger(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, trigger]);

  // 6) Proactive session expiry warning / expiry — uses token's exp + lastActivity,
  //    not a local wall-clock that drifts from the JWT.
  React.useEffect(() => {
    if (status !== "authenticated") return;
    const tokenExpMs =
      session &&
      typeof (session as unknown as { expires?: string }).expires === "string"
        ? new Date(
            (session as unknown as { expires: string }).expires,
          ).getTime()
        : null;
    const check = () => {
      const now = Date.now();
      // Prefer absolute JWT exp if present; fallback to idle window.
      const remaining =
        tokenExpMs !== null && !Number.isNaN(tokenExpMs)
          ? tokenExpMs - now
          : IDLE_TIMEOUT_MS;
      if (remaining <= 0) {
        trigger(true);
      } else if (remaining <= WARNING_BEFORE_EXPIRY_MS) {
        trigger(false);
      }
    };
    // Seed lastActivity drift guard: also nudge the server to refresh
    // lastActivity at most once per IDLE_REFRESH_THROTTLE_MS via update().
    // We don't rely on local elapsed for truth — token is truth.
    check();
    const id = window.setInterval(check, 15_000);
    return () => window.clearInterval(id);
  }, [status, session, trigger]);

  // Countdown + auto hard-redirect (no Dismiss survival when expired)
  React.useEffect(() => {
    if (!open) return;
    setCountdown(COUNTDOWN_SECONDS);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          void hardRedirect(
            expired ? "expired-countdown" : "warning-countdown",
          );
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, expired, hardRedirect]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // After hard expiry the modal is blocking — no Dismiss, no overlay close.
      if (expired && !next) return;
      setOpen(next);
      if (!next) {
        // Warning phase dismiss → keep user on page but allow future 401 to re-trigger.
        // We also refresh the session to bump lastActivity so the warning doesn't
        // immediately re-fire (throttled server-side).
        hasSignaledRef.current = false;
        setExpired(false);
        void update();
      }
    },
    [expired, update],
  );

  const handleStay = React.useCallback(() => {
    hasSignaledRef.current = false;
    setExpired(false);
    setOpen(false);
    void update();
  }, [update]);

  const handleSignIn = React.useCallback(() => {
    void hardRedirect("signin-click");
  }, [hardRedirect]);

  return (
    <>
      {children}
      {open && (
        <SessionExpiryModal
          open={open}
          onOpenChange={handleOpenChange}
          countdown={countdown}
          countdownTotal={COUNTDOWN_SECONDS}
          callbackUrl={callbackUrl}
          expired={expired}
          onSignIn={handleSignIn}
          onStay={handleStay}
        />
      )}
    </>
  );
}
