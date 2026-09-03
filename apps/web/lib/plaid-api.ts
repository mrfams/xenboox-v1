// Minimal Plaid REST helpers used by the web app.
//
// The plaid npm SDK is NOT installed in this repo (three code paths used to
// `await import("plaid")` and crash with MODULE_NOT_FOUND at runtime). These
// helpers talk to Plaid's REST API directly with plain fetch, matching the
// pattern already used by the jobs package.

const PLAID_API_URL =
  process.env.PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : process.env.PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

function plaidHeaders(): HeadersInit {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientId) headers["PLAID-CLIENT-ID"] = clientId;
  if (secret) headers["PLAID-SECRET"] = secret;
  return headers;
}

function isConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

/**
 * Remove a Plaid item (revoke the access token server-side).
 * Plaid: POST /item/remove with { access_token }.
 * Returns true on success. Throws on API error so callers can decide whether
 * to still delete the local row.
 */
export async function removePlaidItem(
  accessToken: string,
): Promise<{ removed: boolean; requestId?: string }> {
  if (!isConfigured()) {
    // No Plaid configured (demo/dev): nothing to revoke remotely.
    return { removed: true };
  }
  const res = await fetch(`${PLAID_API_URL}/item/remove`, {
    method: "POST",
    headers: plaidHeaders(),
    body: JSON.stringify({ access_token: accessToken }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    request_id?: string;
    error_code?: string;
    error_message?: string;
    display_message?: string | null;
  };
  if (!res.ok) {
    throw new Error(
      `Plaid item removal failed (${res.status}): ${body.error_message ?? body.error_code ?? "unknown error"}`,
    );
  }
  return { removed: true, requestId: body.request_id };
}
