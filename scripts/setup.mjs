#!/usr/bin/env node

/**
 * Xenboox Setup Wizard
 * =====================
 * Semi-automated provisioning of all external services.
 *
 * Usage:  node scripts/setup.mjs
 *         pnpm setup                  (after adding to package.json)
 *
 * What it does:
 *   1. Checks current .env.local for missing vars
 *   2. Auto-provisions what it can (Neon DB, Cloudflare R2, LangFuse, Upstash)
 *   3. Prompts you to paste keys for services without provisioning APIs
 *   4. Guides you through browser-required setup (Google OAuth)
 *   5. Writes everything to .env.local
 *   6. Runs db:push + db:seed
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { createInterface } from "readline";
import { randomBytes } from "crypto";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

// ─── Helpers ────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(query) {
  return new Promise((resolve) => {
    if (rl.closed) { resolve(""); return; }
    rl.question(query, resolve);
  });
}

async function askSecret(query) {
  if (rl.closed) return "";
  const val = await ask(query);
  return val.trim();
}

function green(s) {
  return `\x1b[32m${s}\x1b[0m`;
}
function yellow(s) {
  return `\x1b[33m${s}\x1b[0m`;
}
function cyan(s) {
  return `\x1b[36m${s}\x1b[0m`;
}
function dim(s) {
  return `\x1b[2m${s}\x1b[0m`;
}
function bold(s) {
  return `\x1b[1m${s}\x1b[0m`;
}

function loadEnv() {
  if (!existsSync(ENV_PATH)) return {};
  const content = readFileSync(ENV_PATH, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

function appendEnv(key, value) {
  const line = `${key}="${value}"`;
  appendFileSync(ENV_PATH, `\n${line}`);
}

function setEnv(key, value) {
  appendFileSync(ENV_PATH, `\n# Added by setup script — ${new Date().toISOString()}\n${key}="${value}"`);
}

async function checkOrPrompt(key, label, url, opts = {}) {
  const env = loadEnv();
  if (env[key] && env[key] !== "ROTATE_ME") {
    console.log(`  ${green("✔")} ${label} already set`);
    return env[key];
  }
  console.log(`\n  ${yellow("→")} ${bold(label)} is missing`);
  if (url) console.log(`    ${dim("Get it at:")} ${cyan(url)}`);
  const skipMsg = opts.optional ? " (press Enter to skip)" : "";
  const val = await askSecret(`    ${dim("Paste value")}${skipMsg}: `);
  if (!val) {
    if (opts.optional) {
      console.log(`  ${dim("  skipped")}`);
      return null;
    }
    return await checkOrPrompt(key, label, url, opts);
  }
  return val;
}

async function tryAutoProvision(label, url, instructions) {
  console.log(`\n  ${yellow("→")} ${bold(label)} needs a management API key to auto-provision.`);
  console.log(`    ${dim("Get a management key at:")} ${cyan(url)}`);
  const key = await askSecret(`    ${dim("Paste management API key (or press Enter to skip auto):")} `);
  if (!key) {
    console.log(`  ${dim("  skipped auto-provision")}`);
    return null;
  }
  return key;
}

// ─── Provisioners ───────────────────────────────────────────────────────

async function provisionNeon(apiKey) {
  console.log(`    ${dim("Creating Neon project...")}`);
  try {
    const res = await fetch("https://console.neon.tech/api/v2/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: { name: "xenboox", region_id: "eu-west-2" },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log(`    ${yellow("⚠")} Neon API error: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const project = data.project;
    const conn = project.connection_uris?.[0]?.connection_uri;
    if (conn) {
      const poolUrl = conn.replace("://", "://") + "?sslmode=require";
      setEnv("DATABASE_URL", poolUrl);
      console.log(`  ${green("✔")} Neon project created: ${project.name}`);
      console.log(`    ${dim("Connection string written to .env.local")}`);
      return poolUrl;
    }
    return null;
  } catch (e) {
    console.log(`    ${yellow("⚠")} Network error: ${e.message}`);
    return null;
  }
}

async function provisionCloudflareR2(apiToken) {
  console.log(`    ${dim("Creating R2 bucket...")}`);
  try {
    // Get accounts first
    const acctRes = await fetch("https://api.cloudflare.com/client/v4/accounts", {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!acctRes.ok) {
      console.log(`    ${yellow("⚠")} Cloudflare API error: invalid token?`);
      return null;
    }
    const acctData = await acctRes.json();
    const accountId = acctData.result?.[0]?.id;
    if (!accountId) {
      console.log(`    ${yellow("⚠")} No Cloudflare account found`);
      return null;
    }

    // Create bucket
    const bucketRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "xenboox-uploads" }),
      },
    );

    if (!bucketRes.ok && bucketRes.status !== 409) {
      const err = await bucketRes.text();
      console.log(`    ${yellow("⚠")} R2 bucket error: ${err.slice(0, 200)}`);
      return null;
    }

    setEnv("R2_ACCOUNT_ID", accountId);
    setEnv("R2_BUCKET_NAME", "xenboox-uploads");
    console.log(`  ${green("✔")} R2 bucket created`);
    console.log(`    ${dim("Need R2 access keys — create them at:")} ${cyan("https://dash.cloudflare.com/?to=/:account/r2/api-tokens")}`);
    return accountId;
  } catch (e) {
    console.log(`    ${yellow("⚠")} Network error: ${e.message}`);
    return null;
  }
}

async function provisionUpstashRedis(email, apiKey) {
  console.log(`    ${dim("Creating Upstash Redis database...")}`);
  try {
    const res = await fetch("https://api.upstash.com/v2/redis/database", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        database_name: "xenboox",
        region: "eu-west-1",
        tier: "free",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log(`    ${yellow("⚠")} Upstash error: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    if (data.rest_url && data.rest_token) {
      setEnv("UPSTASH_REDIS_REST_URL", data.rest_url);
      setEnv("UPSTASH_REDIS_REST_TOKEN", data.rest_token);
      console.log(`  ${green("✔")} Upstash Redis created`);
      return data;
    }
    return null;
  } catch (e) {
    console.log(`    ${yellow("⚠")} Network error: ${e.message}`);
    return null;
  }
}

async function provisionLangFuse(publicKey, secretKey) {
  setEnv("LANGFUSE_PUBLIC_KEY", publicKey);
  setEnv("LANGFUSE_SECRET_KEY", secretKey);
  setEnv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com");
  console.log(`  ${green("✔")} LangFuse keys saved`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${bold("╔══════════════════════════════════════════╗")}`);
  console.log(`${bold("║      Xenboox Setup Wizard")}              ${bold("║")}`);
  console.log(`${bold("╚══════════════════════════════════════════╝")}\n`);

  // Create .env.local if it doesn't exist
  if (!existsSync(ENV_PATH)) {
    writeFileSync(ENV_PATH, `# Xenboox Local Environment — created by setup script\n# ${new Date().toISOString()}\n`);
  }

  const env = loadEnv();
  const setCount = Object.keys(env).filter((k) => env[k] && env[k] !== "ROTATE_ME").length;
  const missing = [];

  const ALL_VARS = [
    { key: "DATABASE_URL", label: "Neon PostgreSQL", optional: false, provision: "neon" },
    { key: "AUTH_SECRET", label: "Auth.js secret", optional: false, generate: true },
    { key: "AUTH_GOOGLE_ID", label: "Google OAuth Client ID", optional: true },
    { key: "AUTH_GOOGLE_SECRET", label: "Google OAuth Client Secret", optional: true },
    { key: "ANTHROPIC_API_KEY", label: "Anthropic Claude API key", optional: false },
    { key: "OPENAI_API_KEY", label: "OpenAI API key (fallback)", optional: true },
    { key: "RESEND_API_KEY", label: "Resend API key", optional: false },
    { key: "RESEND_FROM_EMAIL", label: "Resend sender email", optional: false },
    { key: "R2_ACCOUNT_ID", label: "Cloudflare R2 Account ID", optional: false, provision: "r2" },
    { key: "R2_ACCESS_KEY_ID", label: "R2 Access Key ID", optional: false },
    { key: "R2_SECRET_ACCESS_KEY", label: "R2 Secret Access Key", optional: false },
    { key: "R2_BUCKET_NAME", label: "R2 Bucket Name", optional: false },
    { key: "R2_PUBLIC_URL", label: "R2 Public URL", optional: true },
    { key: "LANGFUSE_PUBLIC_KEY", label: "LangFuse Public Key", optional: false },
    { key: "LANGFUSE_SECRET_KEY", label: "LangFuse Secret Key", optional: false },
    { key: "LANGFUSE_BASE_URL", label: "LangFuse Base URL", optional: false },
    { key: "TRIGGER_SECRET_KEY", label: "Trigger.dev Secret Key", optional: true },
    { key: "TRIGGER_API_KEY", label: "Trigger.dev API Key", optional: true },
    { key: "UPSTASH_REDIS_REST_URL", label: "Upstash Redis URL", optional: true, provision: "upstash" },
    { key: "UPSTASH_REDIS_REST_TOKEN", label: "Upstash Redis Token", optional: true, provision: "upstash" },
    { key: "WEBHOOK_SECRET", label: "Webhook Secret", optional: true, generate: true },
    { key: "MONO_WEBHOOK_SECRET", label: "Mono Webhook Secret", optional: true, generate: true },
    { key: "MODEMPAY_SECRET_KEY", label: "ModemPay Secret Key", optional: true },
    { key: "MODEMPAY_PUBLIC_KEY", label: "ModemPay Public Key", optional: true },
    { key: "NEXTAUTH_URL", label: "NextAuth URL", optional: false },
    { key: "NEXT_PUBLIC_APP_URL", label: "App URL", optional: false },
  ];

  for (const v of ALL_VARS) {
    if (env[v.key] && env[v.key] !== "ROTATE_ME") continue;
    missing.push(v);
  }

  console.log(`  ${bold("Current status:")} ${setCount} variables set, ${missing.length} missing\n`);

  if (missing.length === 0) {
    console.log(`  ${green("✔ Everything is set up!")}`);
    rl.close();
    return;
  }

  // ── Step 1: Auto-provision what we can ──

  console.log(`${bold("── Auto-Provisioning ──")}\n`);

  const envNow = loadEnv();

  if (!envNow.DATABASE_URL || envNow.DATABASE_URL === "ROTATE_ME") {
    const key = await tryAutoProvision(
      "Neon Database",
      "https://console.neon.tech/app/settings/api-keys",
    );
    if (key) await provisionNeon(key);
  }

  if (!envNow.R2_ACCOUNT_ID || envNow.R2_ACCOUNT_ID === "ROTATE_ME") {
    const token = await tryAutoProvision(
      "Cloudflare R2",
      "https://dash.cloudflare.com/profile/api-tokens",
    );
    if (token) await provisionCloudflareR2(token);
  }

  if (!envNow.UPSTASH_REDIS_REST_URL || envNow.UPSTASH_REDIS_REST_URL === "ROTATE_ME") {
    const key = await tryAutoProvision(
      "Upstash Redis",
      "https://console.upstash.com/account/api",
    );
    if (key) await provisionUpstashRedis("", key);
  }

  // ── Step 2: Generate what can be generated ──

  console.log(`\n${bold("── Generated Values ──")}\n`);

  const envNow2 = loadEnv();
  if (!envNow2.AUTH_SECRET || envNow2.AUTH_SECRET === "ROTATE_ME") {
    const secret = randomBytes(32).toString("base64");
    setEnv("AUTH_SECRET", secret);
    console.log(`  ${green("✔")} Auth.js secret generated`);
  }
  if (!envNow2.WEBHOOK_SECRET) {
    setEnv("WEBHOOK_SECRET", randomBytes(24).toString("hex"));
    console.log(`  ${green("✔")} Webhook secret generated`);
  }
  if (!envNow2.MONO_WEBHOOK_SECRET) {
    setEnv("MONO_WEBHOOK_SECRET", randomBytes(24).toString("hex"));
    console.log(`  ${green("✔")} Mono webhook secret generated`);
  }

  // ── Step 3: Interactive paste for the rest ──

  console.log(`\n${bold("── Manual Setup ──")}\n`);

  const envNow3 = loadEnv();
  const remaining = ALL_VARS.filter((v) => {
    const val = envNow3[v.key];
    return !val || val === "ROTATE_ME";
  });

  for (const v of remaining) {
    const url = getSetupUrl(v.key);
    const val = await checkOrPrompt(v.key, v.label, url, { optional: v.optional });
    if (val) setEnv(v.key, val);
  }

  // ── Step 4: URL defaults ──

  const envNow4 = loadEnv();
  if (!envNow4.NEXTAUTH_URL) {
    const ans = await askSecret(`    ${dim("NextAuth URL (default: http://localhost:3000):")} `);
    setEnv("NEXTAUTH_URL", ans || "http://localhost:3000");
  }
  if (!envNow4.NEXT_PUBLIC_APP_URL) {
    const ans = await askSecret(`    ${dim("App URL (default: http://localhost:3000):")} `);
    setEnv("NEXT_PUBLIC_APP_URL", ans || "http://localhost:3000");
  }

  // ── Step 5: Run DB setup ──

  console.log(`\n${bold("── Database Setup ──")}\n`);
  const doDb = await ask(`    ${dim("Run database migrations now?")} ${dim("(Y/n):")} `);
  if (doDb.toLowerCase() !== "n") {
    try {
      console.log(`    ${dim("Running pnpm db:push...")}`);
      execSync("pnpm db:push", { cwd: ROOT, stdio: "inherit" });
      console.log(`  ${green("✔")} Database schema applied`);

      const doSeed = await ask(`    ${dim("Seed demo data?")} ${dim("(y/N):")} `);
      if (doSeed.toLowerCase() === "y") {
        execSync("pnpm db:seed", { cwd: ROOT, stdio: "inherit" });
        console.log(`  ${green("✔")} Demo data seeded`);
      }
    } catch (e) {
      console.log(`  ${yellow("⚠")} DB setup failed: ${e.message}`);
      console.log(`    ${dim("You can run manually: pnpm db:push")}`);
    }
  }

  // ── Done ──

  const finalCount = Object.keys(loadEnv()).filter((k) => loadEnv()[k] && loadEnv()[k] !== "ROTATE_ME").length;
  console.log(`\n${green("✔")} ${bold("Setup complete!")}`);
  console.log(`  ${dim(`${finalCount} environment variables configured`)}`);
  console.log(`  ${dim("Run")} ${cyan("pnpm dev")} ${dim("to start the development server")}\n`);

  rl.close();
}

function getSetupUrl(key) {
  const urls = {
    ANTHROPIC_API_KEY: "https://console.anthropic.com/settings/keys",
    OPENAI_API_KEY: "https://platform.openai.com/api-keys",
    RESEND_API_KEY: "https://resend.com/api-keys",
    RESEND_FROM_EMAIL: "Verify a domain at https://resend.com/domains",
    R2_ACCESS_KEY_ID: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    R2_SECRET_ACCESS_KEY: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    R2_BUCKET_NAME: "https://dash.cloudflare.com/?to=/:account/r2/buckets",
    R2_PUBLIC_URL: "https://dash.cloudflare.com/?to=/:account/r2/buckets",
    LANGFUSE_PUBLIC_KEY: "https://cloud.langfuse.com/project/api-keys",
    LANGFUSE_SECRET_KEY: "https://cloud.langfuse.com/project/api-keys",
    LANGFUSE_BASE_URL: "https://cloud.langfuse.com",
    TRIGGER_SECRET_KEY: "https://app.trigger.dev/keys",
    TRIGGER_API_KEY: "https://app.trigger.dev/keys",
    AUTH_GOOGLE_ID: "https://console.cloud.google.com/apis/credentials",
    AUTH_GOOGLE_SECRET: "https://console.cloud.google.com/apis/credentials",
    MODEMPAY_SECRET_KEY: "https://dashboard.modempay.com/settings",
    MODEMPAY_PUBLIC_KEY: "https://dashboard.modempay.com/settings",
  };
  return urls[key] || null;
}

main().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
