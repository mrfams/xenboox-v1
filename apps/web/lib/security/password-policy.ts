/**
 * Password policy — pure, testable. Enforced at registration, password
 * change, and reset. Enterprise posture: 8+ chars, all four character
 * classes, no common patterns, 128-char ceiling (bcrypt truncates at 72
 * bytes — the cap keeps the input within the meaningful range).
 */

export interface PasswordStrength {
  score: number; // 0–5
  errors: string[];
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORD_PATTERNS: string[] = [
  "password",
  "12345678",
  "qwerty123",
  "admin123",
  "letmein",
  "welcome1",
  "monkey123",
  "abc12345",
  "iloveyou1",
  "1qaz2wsx",
  "password1",
  "dragon123",
];

export function getPasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 12) score += 2;
  else if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  else errors.push("At least 8 characters");

  if (/[a-z]/.test(password)) score += 1;
  else errors.push("One lowercase letter");

  if (/[A-Z]/.test(password)) score += 1;
  else errors.push("One uppercase letter");

  if (/[0-9]/.test(password)) score += 1;
  else errors.push("One number");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else errors.push("One special character");

  // Leetspeak normalization — P@ssw0rd → password, so character
  // substitutions don't slip past the common-pattern check.
  const normalized = password
    .toLowerCase()
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/\$/g, "s")
    .replace(/!/g, "i");
  if (
    COMMON_PASSWORD_PATTERNS.some(
      (p) => password.toLowerCase().includes(p) || normalized.includes(p),
    )
  ) {
    score = Math.max(0, score - 2);
    errors.push("Contains a common password pattern");
  }

  return { score: Math.min(5, score), errors };
}

/** Zod-refine-friendly: true when the password meets the full policy. */
export function meetsPasswordPolicy(password: string): boolean {
  return getPasswordStrength(password).errors.length === 0;
}
