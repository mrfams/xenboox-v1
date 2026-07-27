#!/usr/bin/env node

import { spawn } from "child_process";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { WebSocket } from "ws";

const ROOT = resolve(import.meta.dirname, "..");
const ENV = resolve(ROOT, ".env.local");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const TARGETS = [
  {
    service: "Anthropic",
    url: "https://console.anthropic.com/settings/keys",
    key: "ANTHROPIC_API_KEY",
    js: `document.querySelector('div[class*="key"] code, div[class*="token"] code, pre code, input[type="password"]')?.textContent || document.querySelector('input[class*="key"]')?.value || ''`,
    desc: "API key on the settings page",
  },
  {
    service: "Resend",
    url: "https://resend.com/api-keys",
    key: "RESEND_API_KEY",
    js: `Array.from(document.querySelectorAll('code')).map(c=>c.textContent).filter(t=>t.startsWith('re_'))[0] || ''`,
    desc: "Resend API key (re_...)",
  },
  {
    service: "Cloudflare R2",
    url: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    key: "R2_ACCESS_KEY_ID",
    js: `document.body.innerText.substring(0,5000)`,
    desc: "R2 access key",
  },
  {
    service: "LangFuse",
    url: "https://cloud.langfuse.com/project/api-keys",
    key: "LANGFUSE_PUBLIC_KEY",
    js: `document.body.innerText.substring(0,5000)`,
    desc: "LangFuse project keys",
  },
  {
    service: "Upstash",
    url: "https://console.upstash.com/redis",
    key: "UPSTASH_REDIS_REST_URL",
    js: `document.body.innerText.substring(0,5000)`,
    desc: "Upstash Redis credentials",
  },
  {
    service: "OpenAI",
    url: "https://platform.openai.com/api-keys",
    key: "OPENAI_API_KEY",
    js: `Array.from(document.querySelectorAll('code')).map(c=>c.textContent).filter(t=>t.startsWith('sk-'))[0] || ''`,
    desc: "OpenAI API key (sk-...)",
  },
  {
    service: "Trigger.dev",
    url: "https://app.trigger.dev/keys",
    key: "TRIGGER_SECRET_KEY",
    js: `document.body.innerText.substring(0,5000)`,
    desc: "Trigger.dev keys",
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

function saveEnv(key, value) {
  appendFileSync(ENV, `\n${key}="${value}"`);
}

function cdp(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = Date.now();
    ws.onopen = () => ws.send(JSON.stringify({ id, method, params }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === id || (msg.method === "Runtime.consoleAPICalled")) {
        ws.close();
        resolve(msg);
      }
    };
    ws.onerror = reject;
    setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 15000);
  });
}

async function waitForPort(port, ms = 10000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(`http://localhost:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chrome didn't start on port " + port);
}

async function main() {
  console.log("\n=== Xenboox API Key Collector ===\n");
  const env = loadEnv();
  const missing = TARGETS.filter((t) => !env[t.key] || env[t.key] === "ROTATE_ME");
  if (missing.length === 0) {
    console.log("All keys already configured!");
    process.exit(0);
  }
  console.log(`Need ${missing.length} keys.\n`);

  // Start Chrome with debugging
  console.log("Starting Chrome...");
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=9222`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--disable-default-apps`,
  ], { stdio: "ignore" });

  let chromeExited = false;
  chrome.on("exit", () => { chromeExited = true; });

  try {
    const info = await waitForPort(9222);
    console.log(`Chrome ready: ${info.Browser}\n`);

    // Get a page target
    const tabs = await (await fetch("http://localhost:9222/json")).json();
    let tabUrl = tabs[0]?.webSocketDebuggerUrl;

    for (const target of missing) {
      console.log(`\n--- ${target.service} ---`);
      console.log(`Opening ${target.url}`);

      // Open new tab
      const newTab = await (await fetch(`http://localhost:9222/json/new?${encodeURIComponent(target.url)}`)).json();
      if (!newTab?.webSocketDebuggerUrl) {
        console.log("Failed to open tab, skipping");
        continue;
      }
      const wsUrl = newTab.webSocketDebuggerUrl;

      // Wait for page to load
      await new Promise((r) => setTimeout(r, 4000));

      // Try to extract
      const result = await cdp(wsUrl, "Runtime.evaluate", {
        expression: target.js,
        returnByValue: true,
      });
      const text = result?.result?.result?.value || "";
      if (text && text.length > 3) {
        console.log(`Found content (${text.length} chars)`);
        console.log(`First 30 chars: "${text.substring(0, 30)}..."`);
        console.log("Saved! (you can edit .env.local if it captured the wrong value)");
        saveEnv(target.key, text.substring(0, 200));
      } else {
        console.log("Couldn't auto-extract. If you're logged in, the key should be visible.");
        console.log("You can manually add it to .env.local later.");
      }

      // Close tab
      try { await fetch(`http://localhost:9222/json/close/${newTab.id}`); } catch {}
    }

  } finally {
    if (!chromeExited) {
      chrome.kill();
      console.log("\nChrome closed.");
    }
  }

  console.log("\nDone! Check .env.local for the collected keys.");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
