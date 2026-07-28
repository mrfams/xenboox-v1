#!/usr/bin/env node

import { readFileSync, appendFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { execSync } from "child_process";

const ROOT = resolve(import.meta.dirname, "..");
const ENV = resolve(ROOT, ".env.local");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const SERVICES = [
  {
    name: "Anthropic",
    url: "https://console.anthropic.com/settings/keys",
    keys: [
      { env: "ANTHROPIC_API_KEY", label: "API Key", hint: "starts with sk-ant-" },
    ],
  },
  {
    name: "Resend",
    url: "https://resend.com/api-keys",
    keys: [
      { env: "RESEND_API_KEY", label: "API Key", hint: "starts with re_" },
      { env: "RESEND_FROM_EMAIL", label: "Sender Email", hint: "e.g. hello@yourdomain.com" },
    ],
  },
  {
    name: "Cloudflare R2",
    url: "https://dash.cloudflare.com/?to=/:account/r2/overview",
    keys: [
      { env: "R2_ACCOUNT_ID", label: "Account ID", hint: "36-char hex from R2 overview page" },
    ],
    note: "After getting Account ID, create an API token at https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    subkeys: [
      { env: "R2_ACCESS_KEY_ID", label: "Access Key ID", hint: "long alphanumeric" },
      { env: "R2_SECRET_ACCESS_KEY", label: "Secret Access Key", hint: "long base64" },
    ],
    post: [
      { env: "R2_BUCKET_NAME", label: "Bucket Name", hint: "e.g. xenboox-uploads" },
      { env: "R2_PUBLIC_URL", label: "Public URL (optional)", hint: "e.g. https://pub-xxx.r2.dev", optional: true },
    ],
  },
  {
    name: "LangFuse",
    url: "https://cloud.langfuse.com/project/api-keys",
    keys: [
      { env: "LANGFUSE_PUBLIC_KEY", label: "Public Key", hint: "starts with pk-lf-" },
      { env: "LANGFUSE_SECRET_KEY", label: "Secret Key", hint: "starts with sk-lf-" },
    ],
    post: [
      { env: "LANGFUSE_BASE_URL", label: "Base URL", hint: "https://cloud.langfuse.com", default: "https://cloud.langfuse.com" },
    ],
  },
  {
    name: "OpenAI",
    url: "https://platform.openai.com/api-keys",
    keys: [
      { env: "OPENAI_API_KEY", label: "API Key", hint: "starts with sk-", optional: true },
    ],
  },
  {
    name: "Google OAuth",
    url: "https://console.cloud.google.com/apis/credentials",
    keys: [
      { env: "AUTH_GOOGLE_ID", label: "Client ID", hint: "ends with .apps.googleusercontent.com", optional: true },
      { env: "AUTH_GOOGLE_SECRET", label: "Client Secret", hint: "starts with GOCSPX-", optional: true },
    ],
  },
  {
    name: "Trigger.dev",
    url: "https://cloud.trigger.dev/keys",
    keys: [
      { env: "TRIGGER_SECRET_KEY", label: "Secret Key", hint: "starts with tr_", optional: true },
      { env: "TRIGGER_API_KEY", label: "API Key (optional)", hint: "optional", optional: true },
    ],
  },
  {
    name: "Upstash Redis",
    url: "https://console.upstash.com/redis",
    keys: [
      { env: "UPSTASH_REDIS_REST_URL", label: "REST URL", hint: "e.g. https://xxxx.upstash.io", optional: true },
      { env: "UPSTASH_REDIS_REST_TOKEN", label: "REST Token", hint: "long base64", optional: true },
    ],
  },
  {
    name: "ModemPay",
    url: "https://dashboard.modempay.com/settings",
    keys: [
      { env: "MODEMPAY_SECRET_KEY", label: "Secret Key", hint: "optional", optional: true },
      { env: "MODEMPAY_PUBLIC_KEY", label: "Public Key", hint: "optional", optional: true },
    ],
  },
];

function loadEnv() {
  if (!existsSync(ENV)) return {};
  const content = readFileSync(ENV, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[t.slice(0, eq).trim()] = val;
  }
  return vars;
}

function saveKey(key, value) {
  appendFileSync(ENV, `\n${key}="${value}"`);
}

function isSet(env, key) {
  return env[key] && env[key] !== "ROTATE_ME";
}

function openBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { shell: "cmd.exe", stdio: "ignore", timeout: 5000 });
  } catch {
    try {
      execSync(`cmd /c start "" "${url}"`, { stdio: "ignore", timeout: 5000 });
    } catch {}
  }
}

async function promptKey(env, keyDef) {
  const already = isSet(env, keyDef.env);
  if (already && !keyDef.optional) {
    console.log(`  ${green("✔")} ${keyDef.env} already set`);
    return true;
  }
  if (already && keyDef.optional) {
    console.log(`  ${dim("  ○")} ${keyDef.env} already set (optional, skipping)`);
    return true;
  }

  const optLabel = keyDef.optional ? dim(" (optional — press Enter to skip)") : "";
  const hint = keyDef.hint ? dim(` (${keyDef.hint})`) : "";
  const defaultMsg = keyDef.default ? dim(` [${keyDef.default}]`) : "";

  const answer = await ask(`    ${bold(keyDef.label)}${hint}${optLabel}${defaultMsg}: `);
  const val = answer.trim() || keyDef.default || "";
  if (!val) {
    if (keyDef.optional) {
      console.log(`  ${dim("  skipped")}`);
      return false;
    }
    console.log(`  ${yellow("  required — try again or Ctrl+C to quit")}`);
    return promptKey(env, keyDef);
  }
  saveKey(keyDef.env, val);
  console.log(`  ${green("✔")} ${keyDef.env} saved`);
  return true;
}

async function main() {
  console.log(`\n${bold("Xenboox API Key Collector")}`);
  console.log(`${bold("=========================")}\n`);
  console.log(dim("I'll open your browser to each service's dashboard."));
  console.log(dim("Sign in, find the key, copy it, then paste it here.\n"));

  if (!existsSync(ENV)) {
    appendFileSync(ENV, `# Xenboox Local Environment\n# ${new Date().toISOString()}\n`);
  }

  const env = loadEnv();
  let collected = 0;
  let skipped = 0;

  for (const svc of SERVICES) {
    const allKeys = [...svc.keys, ...(svc.subkeys || []), ...(svc.post || [])];
    const allSet = allKeys.every((k) => isSet(env, k));
    if (allSet) {
      console.log(`${green("✔")} ${svc.name} — all keys configured`);
      continue;
    }

    console.log(`\n${bold("── " + svc.name + " ──")}\n`);

    if (svc.note) {
      console.log(`  ${dim(svc.note)}\n`);
    }

    openBrowser(svc.url);
    console.log(`  ${cyan("→")} Browser opened to ${svc.url}`);
    console.log(`  ${dim("  If not already logged in, sign in now.")}\n`);

    // Wait a moment then prompt for each key
    let ready = false;
    for (const k of svc.keys) {
      const done = await promptKey(env, k);
      if (done) collected++; else skipped++;
      ready = true;
    }

    // If there are subkeys (e.g. R2 API tokens that need separate page)
    if (svc.subkeys && svc.subkeys.length > 0) {
      const allSubSet = svc.subkeys.every((k) => isSet(env, k));
      if (!allSubSet) {
        console.log(`\n  ${yellow("→")} Now create an API token and paste the credentials.\n`);
        for (const k of svc.subkeys) {
          const done = await promptKey(env, k);
          if (done) collected++; else skipped++;
        }
      }
    }

    // Post keys (bucket name, URLs, etc.)
    if (svc.post && svc.post.length > 0) {
      for (const k of svc.post) {
        const done = await promptKey(env, k);
        if (done) collected++; else skipped++;
      }
    }

    console.log(`\n  ${green("✔")} ${svc.name} done`);
  }

  console.log(`\n${green("Done!")} Collected ${collected} keys, skipped ${skipped}.`);
  console.log(`${dim("File:")} ${ENV}\n`);

  rl.close();
}

main().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
