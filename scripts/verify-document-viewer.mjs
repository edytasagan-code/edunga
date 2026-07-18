import { chromium } from "playwright";

const page = await chromium.launch({ headless: true }).then((b) => b.newPage());

await page.goto("http://localhost:3000/nauczyciel/baza-zadan", {
  waitUntil: "load",
  timeout: 60000,
});

await page.waitForTimeout(5000);

const bodyPreview = await page.locator("body").innerText();
console.log("body preview:", bodyPreview.slice(0, 300));

const state = await page.evaluate(() => {
  const mathFields = document.querySelectorAll(
    ".document-viewer math-field"
  );
  const firstValue = mathFields[0]?.value ?? "";
  const bodyText = document.body.innerText;
  return {
    mathFieldCount: mathFields.length,
    firstMathValue: firstValue,
    hasRawSqrtInBody: bodyText.includes("\\sqrt"),
    hasMathFieldElement: mathFields.length > 0,
  };
});

console.log(state);
console.log(
  state.hasMathFieldElement && !state.hasRawSqrtInBody
    ? "PASS: MathLive rendering in list"
    : "FAIL"
);

await page.close();
