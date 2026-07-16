import { chromium } from "playwright";

const pages = [
  "http://localhost:3000/",
  "http://localhost:3000/nauczyciel/edytor",
  "http://localhost:3000/nauczyciel/baza-zadan",
];

const browser = await chromium.launch({ headless: true });

for (const url of pages) {
  const page = await browser.newPage();
  const warnings = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("hydration") ||
      text.includes("did not match") ||
      text.includes("Hydration")
    ) {
      warnings.push(text);
    }
  });

  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2000);

  const ids = await page.evaluate(() => {
    const first = document.querySelector("[data-paragraph-id]");
    const text = document.querySelector("[data-node-id][data-node-type='text']");
    return {
      paragraphId: first?.getAttribute("data-paragraph-id"),
      textNodeId: text?.getAttribute("data-node-id"),
    };
  });

  console.log(`\n${url}`);
  console.log("  ids:", ids);
  console.log(
    warnings.length
      ? `  HYDRATION WARNINGS:\n    ${warnings.join("\n    ")}`
      : "  no hydration warnings"
  );

  await page.close();
}

await browser.close();
