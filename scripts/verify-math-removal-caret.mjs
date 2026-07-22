import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/nauczyciel/edytor`, {
    waitUntil: "domcontentloaded",
  });

  const surface = page.locator(".edunga-editor-surface").first();
  await surface.waitFor({ state: "visible" });

  const textNode = surface.locator("[data-node-type='text']").first();
  await textNode.click();
  await page.keyboard.type("Oblicz ");
  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(300);
  await page.keyboard.type("2x+3");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.type(" dalej");
  await page.waitForTimeout(100);

  const before = await surface.evaluate((root) => {
    const texts = [
      ...root.querySelectorAll("[data-node-type='text']"),
    ].map((node) => node.textContent ?? "");
    return texts.join("|");
  });

  const trailingText = surface.locator("[data-node-type='text']").last();
  await trailingText.click();

  await page.evaluate(() => {
    const surface = document.querySelector(".edunga-editor-surface");
    const texts = [
      ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
    ];
    const trailing = texts[texts.length - 1];
    const textChild = trailing?.firstChild;

    if (!trailing || textChild?.nodeType !== Node.TEXT_NODE) {
      return;
    }

    trailing.focus();
    const range = document.createRange();
    range.setStart(textChild, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });

  await page.keyboard.press("Backspace");
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => {
    const surface = document.querySelector(".edunga-editor-surface");
    const texts = [
      ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
    ].map((node) => node.textContent ?? "");
    const mathCount = surface?.querySelectorAll("math-field").length ?? 0;

    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const textElement = anchor?.parentElement?.closest(
      "[data-node-type='text']"
    );
    let offset = 0;

    if (selection && selection.rangeCount > 0 && textElement) {
      const range = selection.getRangeAt(0);
      const textChild = textElement.firstChild;

      if (textChild?.nodeType === Node.TEXT_NODE) {
        if (range.startContainer === textChild) {
          offset = range.startOffset;
        }
      }
    }

    return {
      texts: texts.join("|"),
      mathCount,
      offset,
      fullText: texts.join(""),
    };
  });

  console.log("Before:", before);
  console.log("After:", after);

  const ok =
    after.mathCount === 0 &&
    after.fullText === "Oblicz  dalej" &&
    after.offset === "Oblicz ".length;

  console.log(ok ? "PASS" : "FAIL", "caret after math removal");
  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
