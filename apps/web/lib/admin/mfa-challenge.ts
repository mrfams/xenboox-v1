import { SignJWT, jwtVerify } from "jose";

const CHALLENGE_TTL_SECONDS = 5 * 60;

function getAdminSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.ADMIN_AUTH_SECRET ?? process.env.AUTH_SECRET,
  );
}

/**
 * Short-lived signed token naming an admin user who already passed the
 * password + IP-allowlist checks. Carries no privileges by itself — it is
 * consumed once by the Credentials `authorize` callback together with a
 * valid TOTP code.
 */
export async function createMfaChallenge(adminUserId: string): Promise<string> {
  return new SignJWT({ purpose: "admin_mfa_challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminUserId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS)
    .sign(getAdminSecret());
}

export async function verifyMfaChallenge(
  token: string,
): Promise<{ adminUserId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose === "admin_mfa_challenge" && payload.sub) {
      return { adminUserId: payload.sub as string };
    }
    return null;
  } catch {
    return null;
  }
}
