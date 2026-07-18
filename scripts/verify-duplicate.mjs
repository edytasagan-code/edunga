/**
 * Verify duplicate task flow: list → Duplikuj → editor → save → new task.
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
check("GET task list", listRes.ok && list.length > 0, `count=${list.length}`);

const source = list[0];
const sourceId = source.id;
const sourceKod = source.kod;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${BASE}/nauczyciel/baza-zadan`, { waitUntil: "load" });
await page.waitForFunction(
  (kod) => document.body.textContent?.includes(kod),
  sourceKod
);

const duplicateLink = page.locator(
  `a[href="/nauczyciel/edytor?duplikuj=${sourceId}"]`
);
check("Duplikuj link exists", (await duplicateLink.count()) > 0);

await duplicateLink.first().click();
await page.waitForURL(`**/nauczyciel/edytor?duplikuj=${sourceId}**`);
check("Opens editor with duplikuj param", page.url().includes(`duplikuj=${sourceId}`));

await page.waitForSelector("h1", { timeout: 10000 });
const title = await page.locator("h1").innerText();
check("Editor shows new task title", title.includes("Nowe zadanie"), title);

const kodBadge = await page.locator("h1 + span").count();
check("No EDU code shown", kodBadge === 0, `badges=${kodBadge}`);

await page.waitForSelector("math-field, [contenteditable='true']", {
  timeout: 10000,
});

const klasaValue = await page.locator("select").nth(0).inputValue();
check("Metadata prefilled (klasa)", klasaValue === source.klasaId, klasaValue);

const textField = page
  .locator(".edunga-editor-surface")
  .first()
  .locator("[contenteditable='true']")
  .first();
await textField.click();
await page.keyboard.press("End");
await page.keyboard.type(" DUPLICATE");
await textField.blur();

let postStatus = null;
let created = null;
page.on("response", async (r) => {
  if (r.url().endsWith("/api/zadania") && r.request().method() === "POST") {
    postStatus = r.status();
    try {
      created = await r.json();
    } catch {}
  }
});

await page.locator("button", { hasText: "Zapisz" }).click();
await page.waitForURL("**/nauczyciel/baza-zadan**", { timeout: 15000 });

check("Save uses POST", postStatus === 200, `status=${postStatus}`);
check("New task gets new id", created?.id && created.id !== sourceId, created?.id);
check(
  "New task gets new kod",
  created?.kod && created.kod !== sourceKod,
  `${sourceKod} → ${created?.kod}`
);

const afterList = await fetch(`${BASE}/api/zadania`).then((r) => r.json());
check(
  "New task in database",
  afterList.some((z) => z.id === created?.id),
  created?.id
);
check(
  "Original task unchanged",
  afterList.some((z) => z.id === sourceId && z.kod === sourceKod),
  sourceKod
);

const reloaded = afterList.find((z) => z.id === created?.id);
const duplicatedText = reloaded?.tresc?.paragraphs?.[0]?.children
  ?.filter((n) => n.type === "text")
  .map((n) => n.text)
  .join("");
check(
  "Modified content saved",
  duplicatedText?.includes("DUPLICATE"),
  duplicatedText
);

await browser.close();

console.log(failed ? "\nVERIFICATION FAILED" : "\nVERIFICATION PASSED");
process.exit(failed ? 1 : 0);
