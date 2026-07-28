import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = "C:\\Users\\asano\\AppData\\Local\\Google\\Chrome\\User Data";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  userDataDir: PROFILE,
  headless: false,
  args: ["--remote-debugging-port=9222", "--no-first-run"],
});

const pages = await browser.pages();
console.log("Chrome launched. PID visible. Pages:", pages.length);
console.log("Profile:", PROFILE);

// Keep running
await new Promise(() => {});
