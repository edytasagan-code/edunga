/**
 * Full save/load round-trip verification.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const sampleTresc = {
  version: 1,
  paragraphs: [
    {
      id: "p-test-1",
      children: [
        { id: "t1", type: "text", text: "Oblicz " },
        { id: "m1", type: "math", latex: "\\sqrt{x^2+1}" },
        { id: "t2", type: "text", text: " dla x=2" },
      ],
    },
  ],
};

const sampleOdpowiedz = {
  version: 1,
  paragraphs: [
    {
      id: "p-ans",
      children: [{ id: "t-ans", type: "text", text: "3" }],
    },
  ],
};

const sampleRozwiazanie = {
  version: 1,
  paragraphs: [
    {
      id: "p-sol",
      children: [
        { id: "t-sol", type: "text", text: "x=2 → " },
        { id: "m-sol", type: "math", latex: "\\sqrt{5}" },
      ],
    },
  ],
};

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

// --- API round-trip ---
const postRes = await fetch(`${BASE}/api/zadania`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    klasaId: "1lo",
    dzialId: "zbiory-liczbowe",
    tematId: "zbior-dzialania",
    typ: "otwarte",
    poziom: 3,
    punkty: 2,
    czas: 10,
    tresc: sampleTresc,
    rozwiazanie: sampleRozwiazanie,
    odpowiedz: sampleOdpowiedz,
    tagi: [],
  }),
});

check("POST /api/zadania", postRes.ok, `status=${postRes.status}`);
const created = await postRes.json();
const taskId = created.id;
check("POST returns id", Boolean(taskId), taskId);
check(
  "POST returns kod",
  typeof created.kod === "string" && /^EDU-\d{6}$/.test(created.kod),
  created.kod
);

const listRes = await fetch(`${BASE}/api/zadania`);
const list = await listRes.json();
check(
  "GET /api/zadania list",
  listRes.ok && Array.isArray(list),
  `count=${list.length}`
);
check(
  "Task in list",
  list.some((z) => z.id === taskId),
  taskId
);

const getRes = await fetch(`${BASE}/api/zadania/${taskId}`);
const loaded = await getRes.json();
check("GET /api/zadania/:id", getRes.ok, `status=${getRes.status}`);

check(
  "kod preserved on GET",
  loaded.kod === created.kod,
  `${loaded.kod} vs ${created.kod}`
);

check(
  "EditorDocument preserved (tresc)",
  loaded.tresc.version === sampleTresc.version &&
    loaded.tresc.paragraphs.length === sampleTresc.paragraphs.length &&
    loaded.tresc.paragraphs[0].children.length ===
      sampleTresc.paragraphs[0].children.length &&
    loaded.tresc.paragraphs[0].children.every((node, i) => {
      const expected = sampleTresc.paragraphs[0].children[i];
      return (
        node.id === expected.id &&
        node.type === expected.type &&
        (node.type !== "text" || node.text === expected.text) &&
        (node.type !== "math" || node.latex === expected.latex)
      );
    })
);
check(
  "Math latex preserved",
  loaded.tresc.paragraphs[0].children[1].latex === "\\sqrt{x^2+1}",
  loaded.tresc.paragraphs[0].children[1].latex
);

// --- Browser edit load ---
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}/nauczyciel/edytor/${taskId}`, {
  waitUntil: "load",
});

await page.waitForSelector("math-field", { timeout: 10000 });

const editorState = await page.evaluate(() => {
  const surface = document.querySelector(".edunga-editor-surface");
  const texts = [...surface.querySelectorAll("[data-node-type='text']")].map(
    (el) => el.textContent
  );
  const maths = [...surface.querySelectorAll("math-field")].map(
    (el) => el.value
  );
  return { texts, maths };
});

check(
  "Edit page loads text nodes",
  editorState.texts.join("").includes("Oblicz") &&
    editorState.texts.join("").includes("dla x=2"),
  JSON.stringify(editorState.texts)
);
check(
  "Edit page restores math formula",
  editorState.maths[0]?.includes("sqrt") &&
    editorState.maths[0]?.includes("x^2+1"),
  editorState.maths[0]
);

// List page
await page.goto(`${BASE}/nauczyciel/baza-zadan`, {
  waitUntil: "load",
});
await page.waitForFunction(
  () =>
    !document.body.textContent?.includes("Ładowanie...") &&
    document.body.textContent?.includes("Baza zadań")
);
const listText = await page.locator("body").innerText();
check(
  "List page shows task code",
  listText.includes(created.kod),
  created.kod
);
check(
  "List page shows task content",
  listText.includes("Oblicz") && listText.includes("sqrt"),
  "preview visible"
);
check(
  "List page has Edytuj link",
  (await page.locator(`a[href="/nauczyciel/edytor/${taskId}"]`).count()) > 0
);

// --- UI save flow ---
await page.goto(`${BASE}/nauczyciel/edytor`, {
  waitUntil: "load",
});
const toolbar = page
  .locator(".flex.flex-wrap.items-center.gap-2.border-b")
  .first()
  .locator("button");
await page.locator("[contenteditable='true']").first().click();
await page.keyboard.type("UI test ");
await toolbar.nth(0).click();
await page.waitForTimeout(400);
const uiMath = page.locator("math-field").first();
await uiMath.click();
await toolbar.nth(3).click();
await page.waitForTimeout(200);

await page.locator("select").nth(0).selectOption("1lo");
await page.locator("select").nth(1).selectOption("zbiory-liczbowe");
await page.locator("select").nth(2).selectOption("zbior-dzialania");
await page.locator("select").nth(3).selectOption("otwarte");
await page.locator("select").nth(4).selectOption("3");

let uiPostStatus = null;
let uiTaskId = null;
page.on("response", async (r) => {
  if (
    r.url().includes("/api/zadania") &&
    r.request().method() === "POST"
  ) {
    uiPostStatus = r.status();
    try {
      const body = await r.json();
      uiTaskId = body.id;
    } catch {}
  }
});

await page.locator("button", { hasText: "Zapisz" }).click();
await page.waitForFunction(() => !location.pathname.endsWith("/edytor"));
check("UI save POST", uiPostStatus === 200, `status=${uiPostStatus}`);
check("UI save redirects to edit", Boolean(uiTaskId));

if (uiTaskId) {
  await page.waitForSelector("math-field");
  const uiState = await page.evaluate(() => ({
    text: [...document.querySelectorAll("[data-node-type='text']")]
      .map((el) => el.textContent)
      .join(""),
    math: document.querySelector("math-field")?.value,
  }));
  check(
    "UI round-trip text",
    uiState.text.includes("UI test"),
    uiState.text
  );
  check(
    "UI round-trip math",
    uiState.math?.includes("sqrt"),
    uiState.math
  );

  // --- Edit again + save changes (PUT) ---
  const textField = page
    .locator(".edunga-editor-surface")
    .first()
    .locator("[contenteditable='true']")
    .first();
  await textField.click();
  await page.keyboard.press("End");
  await page.keyboard.type("EDITED");
  await textField.blur();

  let putStatus = null;
  page.on("response", async (r) => {
    if (
      r.url().includes(`/api/zadania/${uiTaskId}`) &&
      r.request().method() === "PUT"
    ) {
      putStatus = r.status();
    }
  });

  page.once("dialog", async (d) => {
    await d.accept();
  });
  await page.locator("button", { hasText: "Zapisz" }).click();
  await page.waitForTimeout(3000);

  check("UI edit save PUT", putStatus === 200, `status=${putStatus}`);

  const reloaded = await fetch(`${BASE}/api/zadania/${uiTaskId}`).then(
    (r) => r.json()
  );
  const reloadedText = reloaded.tresc.paragraphs[0].children
    .filter((n) => n.type === "text")
    .map((n) => n.text)
    .join("");
  check(
    "Edited text persisted",
    reloadedText?.includes("UI test") && reloadedText?.includes("EDITED"),
    reloadedText
  );

  // Reopen from list
  await page.goto(`${BASE}/nauczyciel/baza-zadan`, { waitUntil: "load" });
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Ładowanie...") &&
      document.body.textContent?.includes("Baza zadań")
  );
  await page.locator(`a[href="/nauczyciel/edytor/${uiTaskId}"]`).click();
  await page.waitForSelector("math-field");

  const reopened = await page.evaluate(() => ({
    text: [...document.querySelectorAll("[data-node-type='text']")]
      .map((el) => el.textContent)
      .join(""),
    math: document.querySelector("math-field")?.value,
  }));
  check(
    "Reopen from list restores edited text",
    reopened.text.includes("EDITED"),
    reopened.text
  );
  check(
    "Reopen from list restores math",
    reopened.math?.includes("sqrt"),
    reopened.math
  );
}

await browser.close();

console.log(failed ? "\nVERIFICATION FAILED" : "\nVERIFICATION PASSED");
process.exit(failed ? 1 : 0);
