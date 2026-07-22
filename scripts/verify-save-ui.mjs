/**
 * Step-by-step save flow verification (UI).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

function log(step, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} ${step}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let postStatus = null;
let postUrl = null;

page.on("response", async (res) => {
  const url = res.url();
  if (url.includes("/api/zadania") && res.request().method() === "POST") {
    postStatus = res.status();
    postUrl = url;
  }
});

await page.goto(`${BASE}/nauczyciel/edytor`, {
  waitUntil: "load",
  timeout: 120000,
});

const saveBtn = page.getByRole("button", { name: "💾 Zapisz zadanie" });
await saveBtn.waitFor({ timeout: 60000 });
log("step1 button found", true);

await page.locator("select").nth(0).selectOption("1lo");
await page.waitForFunction(() => {
  const select = document.querySelectorAll("select")[1];
  return select && select.options.length > 1;
});
await page.locator("select").nth(1).selectOption("zbiory-liczbowe");
await page.waitForFunction(() => {
  const select = document.querySelectorAll("select")[2];
  return select && select.options.length > 1;
});
await page.locator("select").nth(2).selectOption("zbior-dzialania");
await page.locator("select").nth(3).selectOption("otwarte");
await page.locator("select").nth(4).selectOption("3");
log("step2 metadata filled", true);

page.on("dialog", async (d) => {
  log("step2 validation alert", false, d.message());
  await d.accept();
});

const editable = page
  .locator(".edunga-editor-surface")
  .first()
  .locator("[contenteditable='true']")
  .first();
await editable.click();
await page.keyboard.type("UI regression test");
log("step3 typed in editor", true);

postStatus = null;
await saveBtn.click();
try {
  await page.waitForURL("**/nauczyciel/baza-zadan**", {
    timeout: 60000,
  });
} catch {
  // fall through for logging
}

log("step4 POST sent", postStatus !== null, `status=${postStatus}`);
log("step5 HTTP 200", postStatus === 200, `status=${postStatus}`);

const url = page.url();
log(
  "step7 redirect to baza-zadan",
  url.includes("/nauczyciel/baza-zadan"),
  url
);

if (url.includes("/nauczyciel/baza-zadan")) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Ładowanie...") &&
      document.body.textContent?.includes("Baza zadań")
  );
  const hasTask = await page
    .locator("a[href*='/nauczyciel/edytor/']")
    .count();
  log("task appears in database", hasTask > 0, `links=${hasTask}`);

  const firstLink = page.locator("a[href*='/nauczyciel/edytor/']").first();
  const href = await firstLink.getAttribute("href");
  await firstLink.click();
  await page.waitForSelector("[contenteditable='true']", { timeout: 60000 });

  const text = await page.evaluate(() =>
    [...document.querySelectorAll("[data-node-type='text']")]
      .map((el) => el.textContent)
      .join("")
  );
  log("reopen shows text", text.includes("UI regression test"), text);

  let putStatus = null;
  page.on("response", async (res) => {
    if (
      res.url().includes("/api/zadania/") &&
      res.request().method() === "PUT"
    ) {
      putStatus = res.status();
    }
  });

  const textField = page.locator("[contenteditable='true']").first();
  await textField.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" EDITED");
  await saveBtn.click();
  await page.waitForTimeout(8000);

  log("edit save PUT 200", putStatus === 200, `status=${putStatus}`);
  log(
    "edit save redirects",
    page.url().includes("/nauczyciel/baza-zadan"),
    page.url()
  );
}

await browser.close();
process.exit(process.exitCode ?? 0);
