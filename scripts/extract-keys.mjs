#!/usr/bin/env node

import puppeteer from "puppeteer-core";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const CDP_URL = "http://localhost:9222";
const ROOT = resolve(import.meta.dirname, "..");
const ENV = resolve(ROOT, ".env.local");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

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
  if (!value || value.length < 3) return;
  appendFileSync(ENV, `\n${key}="${value.trim()}"`);
  console.log(`  ${green("✔")} ${key} saved`);
}

function isSet(env, key) {
  return env[key] && env[key] !== "ROTATE_ME";
}

async function extractText(page, selector) {
  try {
    return await page.$eval(selector, (el) => el.textContent.trim());
  } catch {
    return null;
  }
}

async function findInPage(page, pattern) {
  const text = await page.evaluate(() => document.body.innerText);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.find((l) => pattern.test(l)) || null;
}

async function findKeysInPage(page, prefix, minLen = 10) {
  return await page.evaluate((pfx, min) => {
    const text = document.body.innerText;
    const tokens = text.split(/[\s\n\r,;]+/);
    return tokens.filter((t) => t.startsWith(pfx) && t.length >= min);
  }, prefix, minLen);
}

async function main() {
  console.log(`\n${bold("Xenboox API Key Extractor")}`);
  console.log(`${bold("=========================")}\n`);

  if (!existsSync(ENV)) {
    appendFileSync(ENV, `# Xenboox Local Environment — extracted ${new Date().toISOString()}\n`);
  }

  const env = loadEnv();
  let found = 0;

  console.log(dim("Connecting to Chrome on port 9222...\n"));

  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const mainPage = pages[0];

  try {
    // ── Anthropic ──────────────────────────────────────────────────────
    if (!isSet(env, "ANTHROPIC_API_KEY")) {
      console.log(`\n${bold("Anthropic")}`);
      console.log(dim("  Opening https://console.anthropic.com/settings/keys\n"));
      await mainPage.goto("https://console.anthropic.com/settings/keys", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const keys = await findKeysInPage(mainPage, "sk-ant-");
      if (keys.length > 0) {
        saveKey("ANTHROPIC_API_KEY", keys[0]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find API key (sign-in required?)`);
        console.log(dim("  Manual: https://console.anthropic.com/settings/keys\n"));
      }
    } else {
      console.log(`${green("✔")} Anthropic already configured`);
    }

    // ── Resend ─────────────────────────────────────────────────────────
    if (!isSet(env, "RESEND_API_KEY")) {
      console.log(`\n${bold("Resend")}`);
      console.log(dim("  Opening https://resend.com/api-keys\n"));
      await mainPage.goto("https://resend.com/api-keys", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const keys = await findKeysInPage(mainPage, "re_");
      if (keys.length > 0) {
        saveKey("RESEND_API_KEY", keys[0]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find API key`);
        console.log(dim("  Manual: https://resend.com/api-keys\n"));
      }
    } else {
      console.log(`${green("✔")} Resend already configured`);
    }

    // ── Cloudflare R2 ──────────────────────────────────────────────────
    if (!isSet(env, "R2_ACCOUNT_ID")) {
      console.log(`\n${bold("Cloudflare R2 — Account ID")}`);
      console.log(dim("  Opening https://dash.cloudflare.com/?to=/:account/r2/overview\n"));
      await mainPage.goto("https://dash.cloudflare.com/?to=/:account/r2/overview", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const pageText = await mainPage.evaluate(() => document.body.innerText);
      const accountMatch = pageText.match(/Account[^a-zA-Z]*ID[^a-zA-Z]*([a-f0-9]{32})/i);
      if (accountMatch) {
        saveKey("R2_ACCOUNT_ID", accountMatch[1]);
        found++;
        console.log(`  ${dim("Account ID extracted from page")}`);
      } else {
        console.log(`  ${yellow("⚠")} Could not find Account ID`);
        console.log(dim("  Manual: https://dash.cloudflare.com/?to=/:account/r2/overview\n"));
      }
    } else {
      console.log(`${green("✔")} Cloudflare R2 Account ID already configured`);
    }

    if (!isSet(env, "R2_ACCESS_KEY_ID") || !isSet(env, "R2_SECRET_ACCESS_KEY")) {
      console.log(`\n${bold("Cloudflare R2 — API Tokens")}`);
      console.log(dim("  Opening https://dash.cloudflare.com/?to=/:account/r2/api-tokens\n"));
      await mainPage.goto("https://dash.cloudflare.com/?to=/:account/r2/api-tokens", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const pageText = await mainPage.evaluate(() => document.body.innerText);
      const accessKeyMatch = pageText.match(/([A-Z0-9]{20,40})/);
      if (accessKeyMatch) {
        saveKey("R2_ACCESS_KEY_ID", accessKeyMatch[1]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find Access Key ID`);
        console.log(dim("  Manual: https://dash.cloudflare.com/?to=/:account/r2/api-tokens\n"));
      }
    } else {
      console.log(`${green("✔")} Cloudflare R2 tokens already configured`);
    }

    if (!isSet(env, "R2_BUCKET_NAME")) {
      console.log(`\n${bold("Cloudflare R2 — Bucket Name")}`);
      console.log(dim("  Opening https://dash.cloudflare.com/?to=/:account/r2/buckets\n"));
      await mainPage.goto("https://dash.cloudflare.com/?to=/:account/r2/buckets", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const pageText = await mainPage.evaluate(() => document.body.innerText);
      const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);
      const bucketLine = lines.find((l) => l.includes("xenboox") || l.length > 3 && l.length < 64 && !l.includes(".") && !l.includes(" "));
      if (bucketLine) {
        saveKey("R2_BUCKET_NAME", bucketLine);
        found++;
        console.log(`  ${dim(`Found: ${bucketLine}`)}`);
      } else {
        console.log(`  ${yellow("⚠")} Could not find bucket name`);
        console.log(dim('  Manual: enter bucket name (or use "xenboox-uploads")\n'));
        saveKey("R2_BUCKET_NAME", "xenboox-uploads");
        found++;
      }
    } else {
      console.log(`${green("✔")} R2 Bucket Name already configured`);
    }

    // ── LangFuse ───────────────────────────────────────────────────────
    if (!isSet(env, "LANGFUSE_PUBLIC_KEY") || !isSet(env, "LANGFUSE_SECRET_KEY")) {
      console.log(`\n${bold("LangFuse")}`);
      console.log(dim("  Opening https://cloud.langfuse.com/project/api-keys\n"));
      await mainPage.goto("https://cloud.langfuse.com/project/api-keys", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const publicKeys = await findKeysInPage(mainPage, "pk-lf-");
      const secretKeys = await findKeysInPage(mainPage, "sk-lf-");
      if (publicKeys.length > 0 && !isSet(env, "LANGFUSE_PUBLIC_KEY")) {
        saveKey("LANGFUSE_PUBLIC_KEY", publicKeys[0]);
        found++;
      }
      if (secretKeys.length > 0 && !isSet(env, "LANGFUSE_SECRET_KEY")) {
        saveKey("LANGFUSE_SECRET_KEY", secretKeys[0]);
        found++;
      }
      if (!isSet(loadEnv(), "LANGFUSE_SECRET_KEY") && !isSet(loadEnv(), "LANGFUSE_PUBLIC_KEY")) {
        console.log(`  ${yellow("⚠")} Could not find LangFuse keys`);
        console.log(dim("  Manual: https://cloud.langfuse.com/project/api-keys\n"));
      }
    } else {
      console.log(`${green("✔")} LangFuse already configured`);
    }

    // ── OpenAI ─────────────────────────────────────────────────────────
    if (!isSet(env, "OPENAI_API_KEY")) {
      console.log(`\n${bold("OpenAI")}`);
      console.log(dim("  Opening https://platform.openai.com/api-keys\n"));
      await mainPage.goto("https://platform.openai.com/api-keys", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const keys = await findKeysInPage(mainPage, "sk-");
      if (keys.length > 0) {
        saveKey("OPENAI_API_KEY", keys[0]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find API key`);
        console.log(dim("  Manual: https://platform.openai.com/api-keys (optional)\n"));
      }
    } else {
      console.log(`${green("✔")} OpenAI already configured`);
    }

    // ── Google OAuth ───────────────────────────────────────────────────
    if (!isSet(env, "AUTH_GOOGLE_ID")) {
      console.log(`\n${bold("Google OAuth")}`);
      console.log(dim("  Opening https://console.cloud.google.com/apis/credentials\n"));
      await mainPage.goto("https://console.cloud.google.com/apis/credentials", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const pageText = await mainPage.evaluate(() => document.body.innerText);
      const clientIdMatch = pageText.match(/(\d{10,20}-[a-zA-Z0-9_]{10,40}\.apps\.googleusercontent\.com)/);
      if (clientIdMatch) {
        saveKey("AUTH_GOOGLE_ID", clientIdMatch[1]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find OAuth Client ID`);
        console.log(dim("  Manual: https://console.cloud.google.com/apis/credentials (optional)\n"));
      }
    } else {
      console.log(`${green("✔")} Google OAuth already configured`);
    }

    // ── Trigger.dev ────────────────────────────────────────────────────
    if (!isSet(env, "TRIGGER_SECRET_KEY")) {
      console.log(`\n${bold("Trigger.dev")}`);
      console.log(dim("  Opening https://cloud.trigger.dev/keys\n"));
      await mainPage.goto("https://cloud.trigger.dev/keys", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const keys = await findKeysInPage(mainPage, "tr_");
      if (keys.length > 0) {
        saveKey("TRIGGER_SECRET_KEY", keys[0]);
        found++;
      } else {
        console.log(`  ${yellow("⚠")} Could not find Trigger.dev key`);
        console.log(dim("  Manual: https://cloud.trigger.dev/keys (optional)\n"));
      }
    } else {
      console.log(`${green("✔")} Trigger.dev already configured`);
    }

    // ── Upstash Redis ──────────────────────────────────────────────────
    if (!isSet(env, "UPSTASH_REDIS_REST_URL")) {
      console.log(`\n${bold("Upstash Redis")}`);
      console.log(dim("  Opening https://console.upstash.com/redis\n"));
      await mainPage.goto("https://console.upstash.com/redis", { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const pageText = await mainPage.evaluate(() => document.body.innerText);
      const urlMatch = pageText.match(/(https:\/\/[a-zA-Z0-9]+\.upstash\.io)/);
      const tokenMatch = pageText.match(/([A-Za-z0-9_-]{20,}=)/);
      if (urlMatch) {
        saveKey("UPSTASH_REDIS_REST_URL", urlMatch[1]);
        found++;
      }
      if (tokenMatch) {
        saveKey("UPSTASH_REDIS_REST_TOKEN", tokenMatch[1]);
        found++;
      }
      if (!urlMatch && !tokenMatch) {
        console.log(`  ${yellow("⚠")} Could not find Redis credentials`);
        console.log(dim("  Manual: https://console.upstash.com/redis (optional)\n"));
      }
    } else {
      console.log(`${green("✔")} Upstash Redis already configured`);
    }

  } catch (err) {
    console.error(`\n${yellow("Error during extraction:")} ${err.message}`);
  } finally {
    await browser.disconnect();
  }

  const finalEnv = loadEnv();
  const count = Object.keys(finalEnv).filter((k) => finalEnv[k] && finalEnv[k] !== "ROTATE_ME").length;
  console.log(`\n${green("Done!")} Extracted ${found} new keys. Total configured: ${count}`);
  console.log(dim(".env.local ready\n"));
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
