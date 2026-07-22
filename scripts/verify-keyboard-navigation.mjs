import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";

  if (!ok) {
    failed = true;
  }

  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function snapshot(surface) {
  return surface.evaluate((root) => {
    const texts = [
      ...root.querySelectorAll("[data-node-type='text']"),
    ].map((node) => node.textContent ?? "");

    const maths = [...root.querySelectorAll("math-field")].map(
      (field) => field.value ?? field.getValue?.("latex-without-placeholders") ?? ""
    );

    return {
      selectAll: root.getAttribute("data-select-all"),
      texts,
      maths,
      mathCount: maths.length,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/nauczyciel/edytor`, {
    waitUntil: "networkidle",
  });

  const surface = page.locator(".edunga-editor-surface").first();
  await surface.waitFor({ state: "visible" });

  const textNode = surface.locator("[data-node-type='text']").first();
  await textNode.click();

  await page.keyboard.type("hello");
  let state = await snapshot(surface);
  check("typing text", state.texts.join("").includes("hello"), state.texts.join("|"));

  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(300);

  state = await snapshot(surface);
  check("Alt+F inserts math", state.mathCount === 1, `count=${state.mathCount}`);

  const mathField = surface.locator("math-field").first();
  await mathField.click();
  await page.keyboard.type("x^2");
  await page.waitForTimeout(200);

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.type(" world");

  state = await snapshot(surface);
  check(
    "arrow right exits math and typing continues",
    state.texts.join("").includes(" world"),
    state.texts.join("|")
  );

  const trailingText = surface.locator("[data-node-type='text']").last();
  await trailingText.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(200);

  const activeMath = await page.evaluate(() =>
    Boolean(document.querySelector("math-field:focus-within"))
  );
  check("arrow left re-enters math", activeMath);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);

  await page.keyboard.press("Control+a");
  await page.waitForTimeout(100);

  state = await snapshot(surface);
  check(
    "Ctrl+A selects all",
    state.selectAll === "true",
    `attr=${state.selectAll}`
  );

  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);

  state = await snapshot(surface);
  check(
    "Delete after Ctrl+A clears editor",
    state.mathCount === 0 &&
      state.texts.every((text) => text.length === 0) &&
      state.selectAll === null,
    JSON.stringify(state)
  );

  await page.keyboard.type("ready");
  state = await snapshot(surface);
  check(
    "editor ready for typing after clear",
    state.texts.join("").includes("ready"),
    state.texts.join("|")
  );

  await browser.close();

  if (failed) {
    process.exit(1);
  }

  console.log("\nAll keyboard navigation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
