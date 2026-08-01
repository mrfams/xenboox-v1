export const ADMIN_SESSION_INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4h inactivity timeout
export const ADMIN_SESSION_HARD_CAP_MS = 12 * 60 * 60 * 1000; // 12h hard cap
export const MAX_CONCURRENT_SESSIONS = 3;
export const LOCKOUT_THRESHOLD = 5; // failed attempts before lockout
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lockout

type SessionWindow = {
  issuedAt: Date;
  lastActiveAt: Date;
  now: Date;
};

/**
 * Expiry = min(issuedAt + 12h hard cap, lastActiveAt + 4h inactivity).
 * Guarantees a session can never outlive the 12h cap even when the user
 * stays active, and can never stay alive past 4h of inactivity.
 */
export function computeSessionExpiry({
  issuedAt,
  lastActiveAt,
}: SessionWindow): Date {
  const hardCap = issuedAt.getTime() + ADMIN_SESSION_HARD_CAP_MS;
  const inactivity = lastActiveAt.getTime() + ADMIN_SESSION_INACTIVITY_MS;
  return new Date(Math.min(hardCap, inactivity));
}

type SessionRow = {
  expiresAt: Date;
  revokedAt: Date | null;
};

export function isSessionActive(session: SessionRow, now: Date): boolean {
  if (session.revokedAt && session.revokedAt <= now) return false;
  if (session.expiresAt <= now) return false;
  return true;
}

/** True when we must evict the oldest session to stay within the cap. */
export function shouldEvictOldest(
  currentSessionCount: number,
  maxConcurrent = MAX_CONCURRENT_SESSIONS,
): boolean {
  return currentSessionCount >= maxConcurrent;
}

/** True when the account should be locked after this failed attempt. */
export function shouldLockAccount(
  failedAttemptsAfterIncrement: number,
  threshold = LOCKOUT_THRESHOLD,
): boolean {
  return failedAttemptsAfterIncrement >= threshold;
}

/** Remaining lockout ms; 0 when the lock has already expired. */
export function lockoutRemainingMs(lockoutUntil: Date, now: Date): number {
  const remaining = lockoutUntil.getTime() - now.getTime();
  return remaining > 0 ? remaining : 0;
}
