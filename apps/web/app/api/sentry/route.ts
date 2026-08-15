// Sentry Tunnel Route
//
// The browser SDK is configured with `tunnelRoute: "/api/sentry"` so client
// events are POSTed same-origin instead of directly to Sentry's ingest.
// This matters for two reasons:
//   1. CSP: `connect-src` does NOT include *.ingest.sentry.io — a direct
//      ingest POST would be blocked by the strict production policy. The
//      tunnel keeps client telemetry flowing through the same-origin.
//   2. Ad-blockers: many block *.sentry.io domains; same-origin tunneling
//      routes around them so errors/transactions/vitals actually arrive.
//
// The envelope carries its own DSN, so this route needs no server-side
// secret — it forwards verbatim to the DSN's project ingest endpoint.
// See: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EnvelopeHeader {
  dsn?: string;
}

export async function POST(request: Request) {
  try {
    const envelope = await request.text();

    // The first line of a Sentry envelope is a JSON header object that
    // includes the DSN. Parse just that line.
    const headerLine = envelope.split("\n", 1)[0];
    if (!headerLine) {
      return NextResponse.json({ error: "empty envelope" }, { status: 400 });
    }

    let header: EnvelopeHeader;
    try {
      header = JSON.parse(headerLine) as EnvelopeHeader;
    } catch {
      return NextResponse.json(
        { error: "invalid envelope header" },
        { status: 400 },
      );
    }

    if (!header.dsn) {
      return NextResponse.json(
        { error: "envelope missing dsn" },
        { status: 400 },
      );
    }

    let dsn: URL;
    try {
      dsn = new URL(header.dsn);
    } catch {
      return NextResponse.json({ error: "invalid dsn" }, { status: 400 });
    }

    // DSN shape: https://<publicKey>@<host>/<projectId>. Ingest endpoint:
    // https://<host>/api/<projectId>/envelope/
    const projectId = dsn.pathname.replace(/^\//, "").replace(/\/$/, "");
    if (!/^\d+$/.test(projectId)) {
      return NextResponse.json(
        { error: "malformed dsn path" },
        { status: 400 },
      );
    }

    const ingestUrl = `https://${dsn.host}/api/${projectId}/envelope/`;

    const upstream = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
      body: envelope,
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        // Ad-blockers abort the response body on some browsers when a
        // non-2xx sneaks through; keep the tunnel opaque to the page.
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    // Never crash the request path on a telemetry failure — client telemetry
    // is best-effort by design.
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "sentry tunnel: envelope forwarding failed",
    );
    return NextResponse.json({ error: "tunnel failed" }, { status: 500 });
  }
}
