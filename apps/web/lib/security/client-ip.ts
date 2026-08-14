// ─── Trusted-Proxy-Safe Client IP Extraction (§19.2) ──────────────────────
//
// Rate-limit keys derived from a raw `x-forwarded-for` are spoofable: a client
// can send `x-forwarded-for: 203.0.113.1` and every request looks like it
// comes from someone else's IP, defeating per-IP limits.
//
// Defense rules (in priority order):
//   1. `x-vercel-forwarded-for` — set ONLY by Vercel's edge (never client
//      writable); the single, authoritative client address.
//   2. Rightmost entry of `x-forwarded-for` — when a trusted proxy appends,
//      the RIGHTMOST address is the one the proxy saw; anything a client
//      prepended sits to the LEFT. Taking the rightmost hop therefore ignores
//      client-supplied values. (Vercel preserves client-provided values by
//      PREPENDING, so the rightmost is Vercel's own observation.)
//   3. `x-real-ip` — set by some proxies (nginx); acceptable fallback.
//   4. `unknown` — never crash, never use an empty key.
//
// Never trust the leftmost value, never trust a header the client can set
// wholesale (only x-vercel-forwarded-for is fully trusted).

export type HeaderSource =
  | Headers
  | { get(name: string): string | null | undefined }
  | Record<string, string | undefined>;

function getHeader(source: HeaderSource, name: string): string | null {
  if (typeof source.get === "function") {
    const v = source.get(name);
    return v == null ? null : String(v);
  }
  const v = (source as Record<string, string | undefined>)[name];
  return v == null ? null : v;
}

/** Trim a single address, rejecting junk (CIDR suffixes, ports, empties). */
function normalizeIp(raw: string): string | null {
  let candidate = raw.trim();
  if (!candidate) return null;
  // Strip IPv6 zone ids (`fe80::1%eth0` → `fe80::1`).
  candidate = candidate.split("%")[0]!;
  if (candidate.startsWith("[")) {
    // Bracketed IPv6, possibly with a port: `[2001:db8::1]:443`.
    const close = candidate.indexOf("]");
    candidate = close > 0 ? candidate.slice(1, close) : candidate;
  } else if (candidate.includes(":")) {
    const colonCount = candidate.split(":").length - 1;
    if (colonCount === 1) {
      // IPv4-with-port form (`192.0.2.1:8080`) — strip the numeric port.
      const [host, port] = candidate.split(":");
      if (host && port && /^\d+$/.test(port)) candidate = host;
    }
    // colonCount > 1 = bare IPv6, keep whole.
  }
  const cleaned = candidate.trim();
  // Reject junk: empty, "unknown", and unspecified IPv6 (`::` / `0.0.0.0`).
  if (
    !cleaned ||
    cleaned === "unknown" ||
    cleaned === "::" ||
    cleaned === "0.0.0.0"
  ) {
    return null;
  }
  return cleaned;
}

export function getClientIp(source: HeaderSource): string {
  // 1. Vercel's authoritative header (edge-injected, not client-writable).
  const vercel = getHeader(source, "x-vercel-forwarded-for");
  const vercelIp = vercel ? normalizeIp(vercel.split(",")[0]!) : null;
  if (vercelIp) return vercelIp;

  // 2. Rightmost hop of x-forwarded-for (client-prepended values are left).
  const fwd = getHeader(source, "x-forwarded-for");
  if (fwd) {
    const hops = fwd.split(",").map(normalizeIp).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }

  // 3. x-real-ip fallback.
  const real = getHeader(source, "x-real-ip");
  const realIp = real ? normalizeIp(real) : null;
  if (realIp) return realIp;

  return "unknown";
}
