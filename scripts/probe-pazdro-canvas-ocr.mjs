import { readFileSync } from "fs";
import { createCanvas } from "canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const worker = await createWorker("pol+eng");

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    const png = canvas.toBuffer("image/png");
    const result = await worker.recognize(png);
    const text = result.data.text ?? "";
    console.log(`\n=== PAGE ${pageNum} (${text.length} chars) ===`);
    console.log(text.slice(0, 3000));
    const nums = [...text.matchAll(/\b1\.\d{1,3}[a-z]?\b/gi)];
    console.log("numbers:", [...new Set(nums.map((m) => m[0]))]);
  }

  await worker.terminate();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
