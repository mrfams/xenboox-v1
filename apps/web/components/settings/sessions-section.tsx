"use client";

import { useState } from "react";
import {
  Smartphone,
  Monitor,
  Globe,
  Trash2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Globe className="h-4 w-4" />;
  const ua = userAgent.toLowerCase();
  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone")
  ) {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

function parseDeviceInfo(userAgent: string | null): {
  device: string;
  browser: string;
  os: string;
} {
  if (!userAgent)
    return { device: "Unknown device", browser: "Unknown", os: "Unknown" };
  const ua = userAgent.toLowerCase();

  let browser = "Unknown";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  let device = "Desktop";
  if (ua.includes("mobile") || ua.includes("iphone")) device = "Phone";
  else if (ua.includes("ipad") || ua.includes("tablet")) device = "Tablet";

  return { device, browser, os };
}

export function SessionsSection() {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const {
    data: sessions,
    isLoading,
    refetch,
  } = trpc.auth.listSessions.useQuery();

  const revokeMutation = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setRevokingId(null);
    },
  });

  const handleRevoke = (sessionId: string) => {
    setRevokingId(sessionId);
    revokeMutation.mutate({ sessionId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          These are the devices and locations where you are currently signed in.
          You can revoke access for any session you don&apos;t recognize.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3 animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-60 bg-muted rounded" />
                </div>
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => {
              const info = parseDeviceInfo(session.userAgent);
              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${session.isCurrent ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 text-muted-foreground">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {info.browser} on {info.os}
                        </p>
                        {session.isCurrent && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {info.device}
                        {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(session.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokingId === session.id}
                      className="text-destructive hover:text-destructive shrink-0 ml-2"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {revokingId === session.id ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No active sessions found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
