import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const TASK_ID = "cmqz6h4nh0007uz4861y8wn35";

async function waitForApiReady(retries = 10) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/zadania/${TASK_ID}`);
      if (res.ok) {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

const ready = await waitForApiReady();
if (!ready) {
  console.log("FAIL step0 api not reachable");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let postSeen = false;
let postStatus = null;
let postBody = null;

page.on("response", async (res) => {
  if (
    res.url().includes("/api/zadania/") &&
    res.request().method() === "PUT"
  ) {
    postSeen = true;
    postStatus = res.status();
    try {
      postBody = await res.text();
    } catch {
      postBody = "<unreadable>";
    }
  }
});

await page.goto(`${BASE}/nauczyciel/edytor/${TASK_ID}`, {
  waitUntil: "domcontentloaded",
});

const saveButton = page.getByRole("button", { name: "💾 Zapisz zadanie" });
await saveButton.waitFor({ timeout: 30000 });
console.log("PASS step1 handler target found");

const beforeUrl = page.url();
await saveButton.click();
console.log("PASS step1 click executed");

await page.waitForTimeout(4000);

if (!postSeen) {
  const alertText = await page.evaluate(() => window.__lastAlertText ?? null);
  console.log("FAIL step4 no PUT request seen", { alertText, beforeUrl });
  await browser.close();
  process.exit(1);
}

console.log("PASS step4 PUT sent", { postStatus });
if (postStatus !== 200) {
  console.log("FAIL step5 non-200", postBody);
  await browser.close();
  process.exit(1);
}

await page.waitForTimeout(2000);
const afterUrl = page.url();
if (!afterUrl.includes("/nauczyciel/baza-zadan")) {
  console.log("FAIL step7 no redirect", { afterUrl });
  await browser.close();
  process.exit(1);
}

console.log("PASS step7 redirected", { afterUrl });
await browser.close();
