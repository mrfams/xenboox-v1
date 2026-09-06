/**
 * Security Hardening Middleware — P5
 *
 * Provides:
 * - Secrets scanning: detect and block API keys, tokens, passwords in requests
 * - Input sanitization: strip/escape dangerous characters from user input
 * - SQL injection guards: detect and block common SQL injection patterns
 * - PII detection: identify and flag personally identifiable information
 */

// ─── Secrets Patterns ─────────────────────────────────────────────────────

const SECRET_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  severity: "block" | "warn";
}> = [
  {
    name: "anthropic_api_key",
    pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g,
    severity: "block",
  },
  {
    name: "openai_api_key",
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    severity: "block",
  },
  {
    name: "aws_access_key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "block",
  },
  {
    name: "aws_secret_key",
    pattern: /aws[_-]?secret[_-]?access[_-]?key["\s:=]+[a-zA-Z0-9/+=]{40}/gi,
    severity: "block",
  },
  {
    name: "github_token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: "block",
  },
  {
    name: "generic_api_key",
    pattern:
      /(api[_-]?key|apikey|secret[_-]?key|auth[_-]?token|bearer)["\s:=]+["']?[a-zA-Z0-9_-]{20,}/gi,
    severity: "warn",
  },
  {
    name: "private_key_block",
    pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/g,
    severity: "block",
  },
  {
    name: "jwt_token",
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    severity: "warn",
  },
  {
    name: "password_in_text",
    pattern: /(password|passwd|pwd)["\s:=]+["']?[^\s"']{8,}/gi,
    severity: "warn",
  },
];

// ─── SQL Injection Patterns ───────────────────────────────────────────────

const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE)\b\s)/i,
  /(--|#|\/\*|\*\/)/,
  /(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /(\bAND\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /(;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE))/i,
  /(CHAR\s*\(|CONCAT\s*\(|0x[0-9a-f]+)/i,
];

// ─── Dangerous Characters ─────────────────────────────────────────────────

const DANGEROUS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

// ─── Types ────────────────────────────────────────────────────────────────

export interface SecretsScanResult {
  clean: boolean;
  findings: Array<{
    name: string;
    severity: "block" | "warn";
    matched: string; // Redacted — shows first/last chars only
    position: number;
  }>;
}

export interface SanitizeResult {
  sanitized: string;
  modifications: string[];
}

export interface SqlInjectionCheckResult {
  safe: boolean;
  patterns: string[];
}

// ─── Secrets Scanning ─────────────────────────────────────────────────────

/**
 * Scan text for leaked secrets (API keys, tokens, passwords).
 * Returns findings with redacted matches — never returns raw secret values.
 */
export function scanForSecrets(text: string): SecretsScanResult {
  const findings: SecretsScanResult["findings"] = [];
  let hasBlock = false;

  for (const { name, pattern, severity } of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0];
      // Redact: show first 4 and last 4 chars
      const redacted =
        raw.length > 12 ? `${raw.slice(0, 4)}...${raw.slice(-4)}` : "****";

      findings.push({
        name,
        severity,
        matched: redacted,
        position: match.index,
      });

      if (severity === "block") hasBlock = true;

      // Don't re-match the same position
      pattern.lastIndex = match.index + raw.length;
    }
  }

  return { clean: !hasBlock, findings };
}

/**
 * Scan request body/headers for secrets. Convenience wrapper.
 */
export function scanRequestForSecrets(
  body?: string,
  headers?: Record<string, string>,
): SecretsScanResult {
  const allFindings: SecretsScanResult["findings"] = [];
  let allClean = true;

  if (body) {
    const bodyResult = scanForSecrets(body);
    allFindings.push(...bodyResult.findings);
    if (!bodyResult.clean) allClean = false;
  }

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      const headerResult = scanForSecrets(`${key}: ${value}`);
      allFindings.push(
        ...headerResult.findings.map((f) => ({
          ...f,
          name: `header:${key}:${f.name}`,
        })),
      );
      if (!headerResult.clean) allClean = false;
    }
  }

  return { clean: allClean, findings: allFindings };
}

// ─── Input Sanitization ───────────────────────────────────────────────────

/**
 * Sanitize user input by stripping dangerous patterns.
 * Preserves normal text while removing XSS vectors.
 */
export function sanitizeInput(input: string): SanitizeResult {
  let sanitized = input;
  const modifications: string[] = [];

  // Strip dangerous HTML/JS patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      sanitized = sanitized.replace(pattern, "[SANITIZED]");
      modifications.push(
        `Removed dangerous pattern: ${pattern.source.slice(0, 30)}...`,
      );
    }
    pattern.lastIndex = 0;
  }

  // Normalize Unicode to prevent homoglyph attacks
  sanitized = sanitized.normalize("NFC");

  // Strip null bytes
  if (sanitized.includes("\0")) {
    sanitized = sanitized.replace(/\0/g, "");
    modifications.push("Removed null bytes");
  }

  // Limit control characters (keep newlines and tabs)
  const beforeControl = sanitized;
  // eslint-disable-next-line no-control-regex -- intentional: stripping control chars
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (sanitized !== beforeControl) {
    modifications.push("Removed control characters");
  }

  return { sanitized, modifications };
}

// ─── SQL Injection Guards ─────────────────────────────────────────────────

/**
 * Check a string for SQL injection patterns.
 * NOTE: This is a defense-in-depth layer — parameterized queries are the
 * primary protection. This catches obvious attempts that slip through.
 */
export function checkSqlInjection(input: string): SqlInjectionCheckResult {
  const matchedPatterns: string[] = [];

  for (const pattern of SQL_INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source.slice(0, 50));
    }
  }

  return {
    safe: matchedPatterns.length === 0,
    patterns: matchedPatterns,
  };
}

// ─── PII Detection ────────────────────────────────────────────────────────

export interface PiiDetectionResult {
  hasPii: boolean;
  types: Array<{
    type: string;
    value: string; // Redacted
    confidence: number;
  }>;
}

const PII_PATTERNS: Array<{
  type: string;
  pattern: RegExp;
  confidence: number;
}> = [
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    confidence: 0.95,
  },
  {
    type: "phone_ghana",
    pattern:
      /(?:(?:\+233|00233)\s?|0)(?:2[0-9]|5[0-9]|2[0-9])\s?\d{3}\s?\d{4}/g,
    confidence: 0.85,
  },
  {
    type: "ghana_card",
    pattern: /\bGHA-\d{9}-\d{1}\b/g,
    confidence: 0.98,
  },
  {
    type: "ssn_us",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.9,
  },
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    confidence: 0.85,
  },
];

/**
 * Detect PII in text. Returns redacted matches.
 */
export function detectPii(text: string): PiiDetectionResult {
  const types: PiiDetectionResult["types"] = [];

  for (const { type, pattern, confidence } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0];
      // Redact: show first 2 and last 2 chars
      const redacted =
        raw.length > 6 ? `${raw.slice(0, 2)}...${raw.slice(-2)}` : "****";

      types.push({ type, value: redacted, confidence });
      pattern.lastIndex = match.index + raw.length;
    }
  }

  return { hasPii: types.length > 0, types };
}

/**
 * Redact PII from text — replaces detected PII with [REDACTED:TYPE].
 */
export function redactPii(text: string): string {
  let redacted = text;

  for (const { type, pattern } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, `[REDACTED:${type.toUpperCase()}]`);
  }

  return redacted;
}

// ─── Combined Security Check ──────────────────────────────────────────────

export interface SecurityCheckResult {
  safe: boolean;
  secrets: SecretsScanResult;
  sqlInjection: SqlInjectionCheckResult;
  pii: PiiDetectionResult;
  sanitized: string;
  reasons: string[];
}

/**
 * Run all security checks on user input.
 * Returns combined result with safe/dangerous verdict.
 */
export function runSecurityChecks(input: string): SecurityCheckResult {
  const secrets = scanForSecrets(input);
  const sqlInjection = checkSqlInjection(input);
  const pii = detectPii(input);
  const { sanitized, modifications } = sanitizeInput(input);

  const reasons: string[] = [];

  if (!secrets.clean) {
    reasons.push(
      `Secrets detected: ${secrets.findings
        .filter((f) => f.severity === "block")
        .map((f) => f.name)
        .join(", ")}`,
    );
  }

  if (!sqlInjection.safe) {
    reasons.push(
      `SQL injection patterns detected: ${sqlInjection.patterns.length} pattern(s)`,
    );
  }

  if (modifications.length > 0) {
    reasons.push(`Input sanitized: ${modifications.join("; ")}`);
  }

  return {
    safe: secrets.clean && sqlInjection.safe,
    secrets,
    sqlInjection,
    pii,
    sanitized,
    reasons,
  };
}
