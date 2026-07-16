/**
 * Sprint 2 acceptance test — full import workflow:
 * PDF upload → detect exercises → edit → save → reload → verify content.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = join(__dirname, "fixtures", "import-sample-math.pdf");

const CURRICULUM = {
  klasaId: "1lo",
  dzialId: "zbiory-liczbowe",
  tematId: "zbior-dzialania",
};

const CORRECTION_SUFFIX = " [ZWERYFIKOWANO]";
const EXPECTED_ANSWER = "5";
const EXPECTED_SOLUTION_SNIPPET = "x=2";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function documentPlainText(document) {
  if (!document?.paragraphs) {
    return "";
  }

  return document.paragraphs
    .map((paragraph) =>
      paragraph.children
        .map((node) => {
          if (node.type === "text") {
            return node.text ?? "";
          }

          if (node.type === "math") {
            return `$${node.latex ?? ""}$`;
          }

          return "";
        })
        .join("")
    )
    .join("\n");
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function focusTextEditor(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!(element instanceof HTMLElement)) {
      return;
    }
    element.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = element.firstChild;
    if (textNode) {
      range.selectNodeContents(textNode);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, selector);
}

async function typeInEditor(page, selector, text) {
  await focusTextEditor(page, selector);
  await page.keyboard.type(text);
  await page.waitForTimeout(200);
}

async function waitForEditor(page) {
  await page.waitForSelector("h1.import-editor__title", {
    timeout: 120000,
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await page.evaluate(() =>
      Boolean(
        document.querySelector(
          ".task-editor-workspace__primary .edunga-editor-surface [data-node-type='text']"
        )
      )
    );

    if (ready) {
      return;
    }

    await page.waitForTimeout(1000);
  }

  const debug = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent ?? null,
    error: document.querySelector(".import-panel--error")?.textContent ?? null,
    hasWorkspace: Boolean(document.querySelector(".task-editor-workspace")),
  }));
  throw new Error(`Editor surface not ready: ${JSON.stringify(debug)}`);
}

async function waitForTaskEditor(page) {
  await page.waitForSelector("h1", { timeout: 120000 });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await page.evaluate(() =>
      Boolean(
        document.querySelector(
          ".task-editor-workspace__primary .edunga-editor-surface [data-node-type='text']"
        )
      )
    );

    if (ready) {
      return;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error("Task editor surface not ready.");
}

// --- Step 1: Upload PDF via API ---
let sessionId = null;
let exerciseCount = 0;

try {
  const pdfBuffer = readFileSync(SAMPLE_PDF);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    "import-sample-math.pdf"
  );

  const processResponse = await fetch(`${BASE}/api/import/process`, {
    method: "POST",
    body: formData,
  });

  const processPayload = await processResponse.json();
  check("1. Upload PDF", processResponse.ok, `status=${processResponse.status}`);
  sessionId = processPayload.sessionId;
  exerciseCount = processPayload.exerciseCount ?? 0;
  check(
    "2. Detect individual exercises",
    exerciseCount >= 2,
    `count=${exerciseCount}`
  );
} catch (error) {
  check(
    "1-2. Upload and detect",
    false,
    error instanceof Error ? error.message : String(error)
  );
}

if (!sessionId) {
  console.log("\n--- SUMMARY ---");
  console.log("Cannot continue without import session.");
  process.exit(1);
}

// Set curriculum metadata on session
const metadataResponse = await fetch(`${BASE}/api/import/${sessionId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    metadata: {
      ...CURRICULUM,
      typ: "otwarte",
      zrodlo: "other",
      identyfikatorPrefix: "IMPORT-TEST",
    },
  }),
});
check(
  "Metadata prepared for save",
  metadataResponse.ok,
  `status=${metadataResponse.status}`
);

const sessionBeforeEdit = await fetch(`${BASE}/api/import/${sessionId}`).then(
  (response) => response.json()
);
const exerciseBefore = sessionBeforeEdit.exercises[0];
const originalPlain = documentPlainText(exerciseBefore?.tresc);
check(
  "Exercise 1 has content before edit",
  originalPlain.length > 10,
  originalPlain.slice(0, 80)
);

// --- UI: open editor, correct, save ---
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let savedTaskId = null;
let savedKod = null;
let expectedTrescPlain = "";

try {
  page.on("dialog", async (dialog) => {
    console.log(`[dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });

  await page.goto(`${BASE}/nauczyciel/import/${sessionId}/zadanie/0`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(3000);
  await waitForEditor(page);
  check("3. Open exercise in editor", true);

  const textNode = page.locator(
    ".task-editor-workspace__primary [data-node-type='text']"
  ).first();
  await typeInEditor(
    page,
    ".task-editor-workspace__primary [data-node-type='text']",
    CORRECTION_SUFFIX
  );

  await typeInEditor(
    page,
    ".task-editor-workspace__answer [data-node-type='text']",
    EXPECTED_ANSWER
  );

  await typeInEditor(
    page,
    ".task-editor-workspace__solution [data-node-type='text']",
    `Dla ${EXPECTED_SOLUTION_SNIPPET} otrzymujemy wynik.`
  );

  check("4. Correct content in editor", true);

  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/zadania") &&
      response.request().method() === "POST",
    { timeout: 90000 }
  );
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/import/${sessionId}/exercises/0`) &&
      response.request().method() === "PATCH",
    { timeout: 90000 }
  );

  await page.getByRole("button", {
    name: "Potwierdź i zapisz do bazy",
  }).click();

  const saveResponse = await saveResponsePromise;
  check(
    "5. Save to database",
    saveResponse.ok(),
    `status=${saveResponse.status()}`
  );

  const patchResponse = await patchResponsePromise;
  check(
    "5b. Import session updated after save",
    patchResponse.ok(),
    `status=${patchResponse.status()}`
  );

  if (!saveResponse.ok()) {
    const errorBody = await saveResponse.text();
    throw new Error(`Save failed: ${errorBody.slice(0, 300)}`);
  }

  const savedTask = await saveResponse.json();
  savedTaskId = savedTask.id;
  savedKod = savedTask.kod;
  check("Saved kod allocated", Boolean(savedKod), savedKod ?? "");

  const sessionRetry = await fetch(`${BASE}/api/import/${sessionId}`).then(
    (response) => response.json()
  );
  const markedSaved = sessionRetry.exercises.some(
    (exercise) => exercise.savedTaskId === savedTaskId
  );
  check(
    "Session marks exercise as saved",
    markedSaved,
    savedTaskId ?? ""
  );
} catch (error) {
  check(
    "3-5. Editor workflow",
    false,
    error instanceof Error ? error.message : String(error)
  );
}

if (!savedTaskId) {
  await browser.close();
  console.log("\n--- SUMMARY ---");
  console.log("Cannot verify database without saved task id.");
  process.exit(1);
}

// --- Step 6-7: Open from database and verify ---
try {
  await page.goto(`${BASE}/nauczyciel/edytor/${savedTaskId}`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(3000);
  await waitForTaskEditor(page);
  check("6. Open saved exercise from database", true);

  const loaded = await fetch(`${BASE}/api/zadania/${savedTaskId}`).then(
    (response) => response.json()
  );

  const loadedTresc = documentPlainText(loaded.tresc);
  const loadedOdpowiedz = documentPlainText(loaded.odpowiedz);
  const loadedRozwiazanie = documentPlainText(loaded.rozwiazanie);

  check(
    "7a. Task content preserved (tresc)",
    normalizeText(loadedTresc).includes("[ZWERYFIKOWANO]"),
    normalizeText(loadedTresc).slice(0, 120)
  );
  check(
    "7b. Answer preserved",
    loadedOdpowiedz.trim() === EXPECTED_ANSWER,
    JSON.stringify(loadedOdpowiedz)
  );
  check(
    "7c. Solution preserved",
    loadedRozwiazanie.includes(EXPECTED_SOLUTION_SNIPPET),
    loadedRozwiazanie
  );
  check(
    "7d. Task kod preserved",
    loaded.kod === savedKod,
    `${loaded.kod} vs ${savedKod}`
  );

  const visibleText = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return surface?.textContent ?? "";
  });
  check(
    "7e. Editor UI shows corrected content",
    visibleText.includes("[ZWERYFIKOWANO]"),
    visibleText.slice(0, 120)
  );
} catch (error) {
  check(
    "6-7. Database round-trip",
    false,
    error instanceof Error ? error.message : String(error)
  );
}

await browser.close();

console.log("\n--- SUMMARY ---");
if (failed) {
  console.log("IMPORT WORKFLOW FAIL");
  process.exit(1);
}

console.log("IMPORT WORKFLOW PASS");
process.exit(0);
