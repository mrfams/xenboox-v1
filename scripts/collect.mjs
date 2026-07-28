import puppeteer from "puppeteer-core";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV = resolve(ROOT, ".env.local");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = process.env.LOCALAPPDATA + "\\Google\\Chrome\\User Data";

function loadEnv() {
  if (!existsSync(ENV)) return {};
  const c = readFileSync(ENV, "utf-8");
  const v = {};
  for (const l of c.split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    v[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return v;
}

const env = loadEnv();
const SERVICES = [
  { service:"Anthropic", url:"https://console.anthropic.com/settings/keys", key:"ANTHROPIC_API_KEY", hint:"sk-ant-" },
  { service:"Resend", url:"https://resend.com/api-keys", key:"RESEND_API_KEY", hint:"re_" },
  { service:"OpenAI", url:"https://platform.openai.com/api-keys", key:"OPENAI_API_KEY", hint:"sk-" },
  { service:"LangFuse SK", url:"https://cloud.langfuse.com/project/api-keys", key:"LANGFUSE_SECRET_KEY", hint:"sk-lf-" },
  { service:"LangFuse PK", url:"https://cloud.langfuse.com/project/api-keys", key:"LANGFUSE_PUBLIC_KEY", hint:"pk-lf-" },
  { service:"Cloudflare R2 Acct", url:"https://dash.cloudflare.com/?to=/:account/r2/overview", key:"R2_ACCOUNT_ID", hint:null, js:`document.querySelector('[class*="account"]')?.textContent || ''` },
  { service:"Upstash", url:"https://console.upstash.com/redis", key:"UPSTASH_REDIS_REST_URL", hint:"https://" },
  { service:"ModemPay", url:"https://dashboard.modempay.com/settings", key:"MODEMPAY_SECRET_KEY", hint:null },
];

const missing = SERVICES.filter(s => !env[s.key] || env[s.key] === "ROTATE_ME");
if (missing.length === 0) { console.log("All keys already configured!"); process.exit(0); }

console.log(`Need ${missing.length} keys. Opening your Chrome profile...\n`);
console.log("A Chrome window will open. If you're not logged into a service, please log in when prompted.\n");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir: PROFILE,
  args: ["--no-first-run", "--no-default-browser-check"],
  defaultViewport: { width: 1280, height: 800 },
});

let page;
try {
  page = await browser.newPage();
  page.setDefaultTimeout(30000);

  for (const target of missing) {
    console.log(`\n── ${target.service} ──`);
    console.log(`  Opening ${target.url}`);
    try {
      await page.goto(target.url, { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const text = await page.evaluate(() => document.body.innerText);
      console.log(`  Page loaded (${text.length} chars)`);

      // Extract all visible text nodes
      const allText = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("code, pre, input[type=password], input[type=text], [class*=key], [class*=token], [class*=secret]"))
          .map(el => el.textContent?.trim() || el.value?.trim() || "")
          .filter(t => t.length > 5 && t.includes && (t.includes("_") || t.includes("-") || t.includes(".")));
      });

      const candidates = allText.filter(t => {
        if (target.hint) return t.includes(target.hint);
        return t.length > 10;
      });

      if (candidates.length > 0) {
        const picked = candidates.sort((a,b) => b.length - a.length)[0];
        appendFileSync(ENV, `\n${target.key}="${picked}"`);
        console.log(`  Found: "${picked.substring(0, 40)}..."`);
      } else {
        // Fallback: try to get any long strings from page
        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 15);
        const keyLines = lines.filter(l => l.includes("_") || l.includes("-") || l.match(/^sk-|^re_|^pk-/));
        if (keyLines.length > 0) {
          const picked = keyLines.sort((a,b) => b.length - a.length)[0];
          appendFileSync(ENV, `\n${target.key}="${picked}"`);
          console.log(`  Found: "${picked.substring(0, 40)}..."`);
        } else {
          console.log(`  Key not auto-detected. The page is open in Chrome —`);
          console.log(`  look for "${target.key}" and copy it here.`);
          console.log(`  First 300 chars of page: ${text.substring(0, 300).replace(/\n/g, " ")}`);
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
} finally {
  if (page) await page.close();
  await browser.close();
}

console.log(`\nDone! Check ${ENV} for the saved keys.`);
console.log("Run: type .env.local");
process.exit(0);
