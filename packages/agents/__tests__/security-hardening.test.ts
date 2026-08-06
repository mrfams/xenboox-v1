/**
 * Security Hardening Tests — P5
 *
 * Tests for:
 * - Secrets scanning (API keys, tokens, passwords)
 * - Input sanitization (XSS, null bytes, control chars)
 * - SQL injection guards
 * - PII detection and redaction
 * - Combined security checks
 */

import { describe, it, expect } from "vitest";
import {
  scanForSecrets,
  scanRequestForSecrets,
  sanitizeInput,
  checkSqlInjection,
  detectPii,
  redactPii,
  runSecurityChecks,
} from "../core/security-hardening";

// ─── Secrets Scanning ─────────────────────────────────────────────────────

describe("scanForSecrets", () => {
  it("detects Anthropic API keys", () => {
    const text = "Using key sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].name).toBe("anthropic_api_key");
    expect(result.findings[0].severity).toBe("block");
  });

  it("detects OpenAI API keys", () => {
    const text = "api_key=sk-abcdefghijklmnopqrstuvwx";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings[0].name).toBe("openai_api_key");
  });

  it("detects AWS access keys", () => {
    const text = "AKIAIOSFODNN7EXAMPLE";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings[0].name).toBe("aws_access_key");
  });

  it("detects GitHub tokens", () => {
    const text = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings[0].name).toBe("github_token");
  });

  it("detects private key blocks", () => {
    const text = "-----BEGIN RSA PRIVATE KEY-----";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings[0].name).toBe("private_key_block");
  });

  it("warns on generic API key patterns", () => {
    const text = 'api_key: "abcdefghijklmnopqrstuvwx"';
    const result = scanForSecrets(text);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("warn");
  });

  it("warns on JWT tokens", () => {
    const text =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const result = scanForSecrets(text);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("redacts matched secrets (no raw values)", () => {
    const text = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456";
    const result = scanForSecrets(text);
    expect(result.findings[0].matched).not.toContain("sk-ant");
    expect(result.findings[0].matched).toContain("...");
  });

  it("returns clean for text without secrets", () => {
    const text = "Hello world, this is a normal message about accounting.";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("handles multiple secrets in one text", () => {
    const text =
      "key1: sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456 and key2: AKIAIOSFODNN7EXAMPLE";
    const result = scanForSecrets(text);
    expect(result.clean).toBe(false);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("scanRequestForSecrets", () => {
  it("scans both body and headers", () => {
    const result = scanRequestForSecrets("Normal body text", {
      Authorization: "Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456",
    });
    expect(result.clean).toBe(false);
    expect(result.findings.some((f) => f.name.includes("header"))).toBe(true);
  });

  it("returns clean for safe requests", () => {
    const result = scanRequestForSecrets('{"name": "test"}', {
      "content-type": "application/json",
    });
    expect(result.clean).toBe(true);
  });
});

// ─── Input Sanitization ───────────────────────────────────────────────────

describe("sanitizeInput", () => {
  it("passes through normal text unchanged", () => {
    const input = "Hello, I need help with my invoice.";
    const result = sanitizeInput(input);
    expect(result.sanitized).toBe(input);
    expect(result.modifications).toHaveLength(0);
  });

  it("strips script tags", () => {
    const input = 'Hello <script>alert("xss")</script> world';
    const result = sanitizeInput(input);
    expect(result.sanitized).not.toContain("<script>");
    expect(result.modifications.length).toBeGreaterThan(0);
  });

  it("strips javascript: URIs", () => {
    const input = "Click javascript:alert(1)";
    const result = sanitizeInput(input);
    expect(result.sanitized).not.toContain("javascript:");
  });

  it("removes null bytes", () => {
    const input = "Hello\x00World";
    const result = sanitizeInput(input);
    expect(result.sanitized).toBe("HelloWorld");
    expect(result.modifications.some((m) => m.includes("null bytes"))).toBe(
      true,
    );
  });

  it("removes control characters but keeps newlines and tabs", () => {
    const input = "Line1\nLine2\tTab\x08\x0E";
    const result = sanitizeInput(input);
    expect(result.sanitized).toContain("\n");
    expect(result.sanitized).toContain("\t");
    expect(result.sanitized).not.toContain("\x08");
    expect(result.sanitized).not.toContain("\x0E");
  });

  it("normalizes Unicode", () => {
    const input = "café"; // decomposed é
    const result = sanitizeInput(input);
    expect(result.sanitized).toBe("café"); // NFC normalized
  });
});

// ─── SQL Injection Guards ─────────────────────────────────────────────────

describe("checkSqlInjection", () => {
  it("passes normal text", () => {
    const result = checkSqlInjection("Show me the balance for account 1000");
    expect(result.safe).toBe(true);
  });

  it("detects UNION SELECT", () => {
    const result = checkSqlInjection("1 UNION SELECT * FROM users");
    expect(result.safe).toBe(false);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it("detects DROP TABLE", () => {
    const result = checkSqlInjection("'; DROP TABLE users; --");
    expect(result.safe).toBe(false);
  });

  it("detects SQL comments", () => {
    const result = checkSqlInjection("admin'--");
    expect(result.safe).toBe(false);
  });

  it("detects OR 1=1", () => {
    const result = checkSqlInjection("' OR 1=1 --");
    expect(result.safe).toBe(false);
  });

  it("detects INSERT statements", () => {
    const result = checkSqlInjection(
      "INSERT INTO users VALUES ('hacker', 'pass')",
    );
    expect(result.safe).toBe(false);
  });

  it("is case insensitive", () => {
    const result = checkSqlInjection("union select * from users");
    expect(result.safe).toBe(false);
  });
});

// ─── PII Detection ────────────────────────────────────────────────────────

describe("detectPii", () => {
  it("detects email addresses", () => {
    const result = detectPii("Contact john@example.com for details");
    expect(result.hasPii).toBe(true);
    expect(result.types.some((t) => t.type === "email")).toBe(true);
  });

  it("detects Ghana phone numbers", () => {
    const result = detectPii("Call +233 24 123 4567");
    expect(result.hasPii).toBe(true);
    expect(result.types.some((t) => t.type === "phone_ghana")).toBe(true);
  });

  it("detects Ghana card numbers", () => {
    const result = detectPii("ID: GHA-123456789-1");
    expect(result.hasPii).toBe(true);
    expect(result.types.some((t) => t.type === "ghana_card")).toBe(true);
  });

  it("redacts detected PII values", () => {
    const result = detectPii("Email: john@example.com");
    const emailFinding = result.types.find((t) => t.type === "email");
    expect(emailFinding).toBeDefined();
    expect(emailFinding!.value).not.toContain("john@example.com");
    expect(emailFinding!.value).toContain("...");
  });

  it("returns no PII for clean text", () => {
    const result = detectPii("The balance is GMD 50,000.00");
    expect(result.hasPii).toBe(false);
    expect(result.types).toHaveLength(0);
  });
});

describe("redactPii", () => {
  it("replaces emails with [REDACTED:EMAIL]", () => {
    const result = redactPii("Contact john@example.com");
    expect(result).toBe("Contact [REDACTED:EMAIL]");
  });

  it("replaces phone numbers", () => {
    const result = redactPii("Call +233 24 123 4567");
    expect(result).toContain("[REDACTED:PHONE_GHANA]");
  });

  it("leaves non-PII text unchanged", () => {
    const input = "The balance is GMD 50,000.00";
    expect(redactPii(input)).toBe(input);
  });
});

// ─── Combined Security Checks ─────────────────────────────────────────────

describe("runSecurityChecks", () => {
  it("passes clean input", () => {
    const result = runSecurityChecks("What is the account balance?");
    expect(result.safe).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("blocks input with secrets", () => {
    const result = runSecurityChecks(
      "My key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456",
    );
    expect(result.safe).toBe(false);
    expect(result.reasons.some((r) => r.includes("Secrets"))).toBe(true);
  });

  it("blocks SQL injection attempts", () => {
    const result = runSecurityChecks("1 UNION SELECT * FROM users");
    expect(result.safe).toBe(false);
    expect(result.reasons.some((r) => r.includes("SQL injection"))).toBe(true);
  });

  it("sanitizes XSS input", () => {
    const result = runSecurityChecks("Hello <script>alert('xss')</script>");
    expect(result.sanitized).not.toContain("<script>");
  });

  it("detects PII without blocking", () => {
    const result = runSecurityChecks("User email is john@example.com");
    expect(result.safe).toBe(true); // PII is detected but not blocked
    expect(result.pii.hasPii).toBe(true);
  });
});
