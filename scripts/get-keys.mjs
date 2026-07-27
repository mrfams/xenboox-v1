#!/usr/bin/env node

/**
 * Browser-based API key extractor.
 * Connects to your running Chrome (port 9222), navigates to each service
 * dashboard, and helps you export API keys into .env.local
 *
 * Usage:
 *   1. Make sure Chrome is running with --remote-debugging-port=9222
 *   2. Log into the services you use in that Chrome
 *   3. Run: node scripts/get-keys.mjs
 */

import { readFileSync, appendFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { WebSocket } from "ws";

const WS_URL = "ws://localhost:9222/devtools/browser/171f09c7-8573-4c63-ac6d-bb81349c1a23";
const ROOT = resolve(import.meta.dirname, "..");
const ENV = resolve(ROOT, ".env.local");

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise((r) => rl.question(q, r)); }

async function getCDPSession() {
  const res = await fetch("http://localhost:9222/json");
  const tabs = await res.json();
  if (tabs.length === 0) throw new Error("No tabs open in Chrome");
  return tabs[0].webSocketDebuggerUrl;
}

async function cdpCall(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    ws.on("open", () => {
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.close();
        resolve(msg.result);
      }
    });
    ws.on("error", reject);
  });
}

function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s) { return `\x1b[36m${s}\x1b[0m`; }
function bold(s) { return `\x1b[1m${s}\x1b[0m`; }

const SERVICES = [
  {
    name: "Anthropic",
    url: "https://console.anthropic.com/settings/keys",
    extract: "document.querySelector('[data-testid=api-key]')?.textContent",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    name: "Resend",
    url: "https://resend.com/api-keys",
    extract: "Array.from(document.querySelectorAll('code')).map(c=>c.textContent).join('\\n')",
    envKey: "RESEND_API_KEY",
  },
  {
    name: "LangFuse",
    url: "https://cloud.langfuse.com/project/api-keys",
    extract: "document.body.innerText",
    envKey: "LANGFUSE_SECRET_KEY",
  },
  {
    name: "Cloudflare R2",
    url: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    extract: "document.body.innerText",
    envKey: "R2_ACCESS_KEY_ID",
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
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return vars;
}

function saveKey(key, value) {
  const env = loadEnv();
  if (env[key] && env[key] !== "ROTATE_ME" && env[key] !== value) {
    // already set, skip
    return false;
  }
  appendFileSync(ENV, `\n${key}="${value}"`);
  return true;
}

async function main() {
  console.log(`\n${bold("Xenboox API Key Extractor")}`);
  console.log(`${bold("=========================")}\n`);

  // Check Chrome connection
  try {
    const res = await fetch("http://localhost:9222/json/version");
    const info = await res.json();
    console.log(`  ${green("✔")} Chrome connected: ${info.Browser}`);
  } catch {
    console.log(`  ${yellow("✗")} Chrome not running on port 9222`);
    console.log(`  ${yellow("→")} Restart Chrome with: chrome.exe --remote-debugging-port=9222\n`);
    process.exit(1);
  }

  const env = loadEnv();
  const wsUrl = await getCDPSession();

  for (const svc of SERVICES) {
    if (env[svc.envKey] && env[svc.envKey] !== "ROTATE_ME") {
      console.log(`  ${green("✔")} ${svc.name} already configured`);
      continue;
    }

    console.log(`\n${bold(svc.name)}`);
    console.log(`  ${cyan("→")} Opening ${svc.url}`);

    // Navigate to the dashboard
    await cdpCall(wsUrl, "Page.navigate", { url: svc.url });
    await new Promise((r) => setTimeout(r, 3000));

    // Try to extract the key
    try {
      const { result } = await cdpCall(wsUrl, "Runtime.evaluate", {
        expression: svc.extract,
        returnByValue: true,
      });
      const val = result?.value;
      if (val && val.length > 5) {
        console.log(`  ${green("✔")} Found key (first 10 chars): ${val.slice(0, 10)}...`);
        const confirm = await ask(`    ${bold("Save this key?")} (Y/n): `);
        if (confirm.toLowerCase() !== "n") {
          saveKey(svc.envKey, val);
          console.log(`  ${green("✔")} Saved to .env.local`);
        }
        continue;
      }
    } catch (e) {
      // ignore eval errors
    }

    // Couldn't auto-extract - ask user
    console.log(`  ${yellow("→")} Couldn't auto-extract. Please copy the key from the page.`);
    console.log(`  ${yellow("→")} If not logged in, log in now, then paste the key below.`);
    const manual = await ask(`    ${bold("Paste key (or Enter to skip):")} `);
    if (manual) {
      saveKey(svc.envKey, manual);
      console.log(`  ${green("✔")} Saved to .env.local`);
    }
  }

  console.log(`\n${green("Done!")} Keys written to ${ENV}`);
  console.log(`  ${bold("Missing keys can be added manually or by re-running this script.")}\n`);
  rl.close();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
