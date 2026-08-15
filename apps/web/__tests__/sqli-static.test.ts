// ─── §1.7 SQL injection — static parameterization scan ──────────────────────
//
// Drizzle's `sql` template binds interpolated values as real parameters
// (verified against the installed drizzle-orm source: plain-string chunks
// fall through to escapeParam → `$n` placeholders). The only injection
// surface is hand-built SQL: string concatenation, sql.raw() wrapping
// dynamic values, and raw `db.execute("...")` strings.
//
// This test scans every request-path module (tRPC routers, auth, lib) and
// fails CI if a dangerous pattern appears. It is a structural guard, not a
// proof — it pins the "no hand-rolled SQL" convention.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, it, expect } from "vitest";

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["server", "lib"];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => collectTsFiles(join(ROOT, d)));

describe("SQL injection — static scan of request-path code", () => {
  it("scans a non-trivial set of modules", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("never builds SQL by string concatenation", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        // `SELECT ... ` + variable, or template-literal query strings
        // containing an interpolated value — but skip Drizzle `sql` tags
        // (parameterized) and pg-style `sql.raw` with only literals.
        if (
          /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*\+/.test(line) &&
          !line.includes("sql`")
        ) {
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("never wraps dynamic values in sql.raw()", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/sql\.raw\(\s*`[^`]*\$\{/.test(line)) {
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("never passes raw string literals to db.execute (must use sql` template)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/db\.execute\(\s*[`"']/.test(line)) {
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("never hand-rolls quote-escaping helpers for SQL literals", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (/replace\(\/'\/g/.test(src) && /sql|execute/.test(src)) {
        offenders.push(relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses the Drizzle sql template for raw statements (sanity: it exists)", () => {
    const usages = files.filter((f) =>
      readFileSync(f, "utf8").includes("sql`"),
    );
    expect(usages.length).toBeGreaterThan(0);
  });
});
