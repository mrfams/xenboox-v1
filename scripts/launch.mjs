import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = "C:\\Users\\asano\\AppData\\Local\\Google\\Chrome\\User Data";

const proc = spawn(CHROME, [
  `--user-data-dir=${PROFILE}`,
  "--remote-debugging-port=9222",
  "--no-first-run",
  "--no-default-browser-check",
], {
  stdio: "ignore",
  detached: true,
});

proc.unref();
console.log("Chrome spawned PID:", proc.pid);

// Wait for port
for (let i = 0; i < 30; i++) {
  await sleep(1000);
  try {
    const r = await fetch("http://localhost:9222/json/version");
    const info = await r.json();
    console.log("Ready! Chrome", info.Browser);
    console.log("WebSocket:", info.webSocketDebuggerUrl);
    process.exit(0);
  } catch {
    // not ready yet
  }
}
console.log("Timeout waiting for Chrome");
process.exit(1);
