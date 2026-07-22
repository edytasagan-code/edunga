import { chromium } from "playwright";

const page = await chromium.launch({ headless: true }).then((b) => b.newPage());

await page.goto("http://localhost:3000/nauczyciel/edytor", {
  waitUntil: "load",
});

await page.locator("select").nth(0).selectOption("1lo");
await page.locator("select").nth(1).selectOption("zbiory-liczbowe");
await page.locator("select").nth(2).selectOption("zbior-dzialania");
await page.locator("select").nth(3).selectOption("otwarte");
await page.locator("select").nth(4).selectOption("3");

await page.locator("button", { hasText: "Zapisz" }).click();
await page.waitForURL("**/nauczyciel/baza-zadan**", {
  timeout: 15000,
});

const notice = await page
  .locator('[role="status"]')
  .innerText()
  .catch(() => "");

console.log({
  url: page.url(),
  notice,
  pass:
    page.url().includes("/nauczyciel/baza-zadan") &&
    notice.includes("Zadanie zapisane"),
});

await page.close();
