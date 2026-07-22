/**
 * Verify exercise variants: add B, switch tabs, save, list tabs.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const listRes = await fetch(`${BASE}/api/zadania`);
const list = await listRes.json();
const source = list[0];
check("Has source task", Boolean(source?.id), source?.kod);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${BASE}/nauczyciel/edytor/${source.id}`, {
  waitUntil: "load",
});
await page.waitForSelector("button", { hasText: "[A]" });

const addButton = page.locator("button", { hasText: "[+]" });
check("Editor shows [+] button", (await addButton.count()) > 0);

await addButton.click();
check("Variant B tab appears", (await page.locator("button", { hasText: "[B]" }).count()) > 0);

await page.locator("button", { hasText: "[B]" }).click();
const textField = page
  .locator(".edunga-editor-surface")
  .first()
  .locator("[contenteditable='true']")
  .first();
await textField.click();
await page.keyboard.type(" VARIANT-B");
await textField.blur();

let putStatus = null;
let saved = null;
page.on("response", async (r) => {
  if (
    r.url().includes(`/api/zadania/${source.id}`) &&
    r.request().method() === "PUT"
  ) {
    putStatus = r.status();
    try {
      saved = await r.json();
    } catch {}
  }
});

await page.locator("button", { hasText: "Zapisz" }).click();
await page.waitForURL("**/nauczyciel/baza-zadan**", { timeout: 15000 });

check("Save succeeds", putStatus === 200, `status=${putStatus}`);
check(
  "Saved two variants",
  Array.isArray(saved?.warianty) && saved.warianty.length === 2,
  `count=${saved?.warianty?.length}`
);

const reloaded = await fetch(`${BASE}/api/zadania/${source.id}`).then((r) =>
  r.json()
);
check(
  "Reload has two variants",
  reloaded.warianty?.length === 2,
  `count=${reloaded.warianty?.length}`
);

const variantBText = reloaded.warianty?.[1]?.tresc?.paragraphs?.[0]?.children
  ?.filter((n) => n.type === "text")
  .map((n) => n.text)
  .join("");
check(
  "Variant B content saved",
  variantBText?.includes("VARIANT-B"),
  variantBText
);

await page.goto(`${BASE}/nauczyciel/baza-zadan`, { waitUntil: "load" });
await page.waitForFunction(
  (kod) => document.body.textContent?.includes(kod),
  source.kod
);

const card = page.locator("article").filter({ hasText: source.kod }).first();
check("List card has variant tabs", (await card.locator("button", { hasText: "[B]" }).count()) > 0);

await card.locator("button", { hasText: "[B]" }).click();
const cardText = await card.innerText();
check("List switches to variant B", cardText.includes("VARIANT-B"), cardText.slice(0, 80));

check(
  "Same EDU code after variant save",
  reloaded.kod === source.kod,
  source.kod
);

await browser.close();

console.log(failed ? "\nVERIFICATION FAILED" : "\nVERIFICATION PASSED");
process.exit(failed ? 1 : 0);
