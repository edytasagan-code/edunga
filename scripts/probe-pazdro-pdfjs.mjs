import { readFileSync } from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  console.log("pages:", doc.numPages);

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    console.log(`\n--- page ${pageNum} text items: ${textContent.items.length} ---`);
    for (const item of textContent.items.slice(0, 30)) {
      const t = item;
      if ("str" in t) {
        console.log(JSON.stringify({
          str: t.str,
          color: t.color,
          fontName: t.fontName,
          transform: t.transform,
        }));
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
