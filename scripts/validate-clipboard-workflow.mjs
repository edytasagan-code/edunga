import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/nauczyciel/edytor`, {
    waitUntil: "load",
    timeout: 180000,
  });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ready = await page.evaluate(() =>
      Boolean(
        document.querySelector(
          ".task-editor-workspace__primary .edunga-editor-surface [data-node-type='text']"
        )
      )
    );
    if (ready) break;
    await page.waitForTimeout(5000);
  }

  const surface = page.locator(
    ".task-editor-workspace__primary .edunga-editor-surface"
  );
  await surface.locator("[data-node-type='text']").first().click();

  await page.keyboard.type("Oblicz ");
  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(300);
  await page.keyboard.type("x");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  await page.keyboard.type(" dalej");
  await page.waitForTimeout(150);

  const before = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return {
      math: surface?.querySelectorAll("math-field").length ?? 0,
      text: surface?.textContent ?? "",
    };
  });

  await page.keyboard.press("Control+a");
  await page.waitForTimeout(200);
  await page.keyboard.press("Control+c");
  await page.waitForTimeout(200);

  await page.keyboard.press("Control+a");
  await page.waitForTimeout(100);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);

  const empty = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return (surface?.querySelectorAll("math-field").length ?? 0) === 0;
  });

  await surface.locator("[data-node-type='text']").first().click();
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(500);

  const afterPaste = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return {
      math: surface?.querySelectorAll("math-field").length ?? 0,
      text: surface?.textContent ?? "",
    };
  });

  await surface.locator("[data-node-type='text']").first().click();
  await page.keyboard.press("End");
  await page.waitForTimeout(100);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(200);

  const afterDelete = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return surface?.textContent ?? "";
  });

  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);

  const afterUndo = await page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    return {
      math: surface?.querySelectorAll("math-field").length ?? 0,
      text: surface?.textContent ?? "",
    };
  });

  console.log("Before:", before);
  console.log("Empty after delete-all:", empty);
  console.log("After paste:", afterPaste);
  console.log("After delete:", afterDelete);
  console.log("After undo:", afterUndo);

  const pass =
    before.math === 1 &&
    afterPaste.math === 1 &&
    afterPaste.text.includes("Oblicz") &&
    afterPaste.text.includes("dalej") &&
    afterUndo.math === 1;

  console.log(pass ? "WORKFLOW PASS" : "WORKFLOW FAIL");
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
