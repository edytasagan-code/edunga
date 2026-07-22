import { readFileSync } from "fs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const buf = readFileSync(pdfPath);

  try {
    const meta = await sharp(buf, { density: 200 }).metadata();
    console.log("sharp metadata:", meta);
  } catch (error) {
    console.error("sharp metadata failed:", error);
  }

  for (let page = 0; page < 2; page += 1) {
    try {
      const png = await sharp(buf, { density: 220, page })
        .png()
        .toBuffer();
      console.log(`page ${page + 1} png bytes:`, png.length);

      const worker = await createWorker("pol+eng");
      const result = await worker.recognize(png);
      const text = result.data.text ?? "";
      console.log(`\n=== PAGE ${page + 1} (${text.length} chars) ===`);
      console.log(text.slice(0, 2500));
      const nums = [...text.matchAll(/\b1\.\d{1,3}[a-z]?\b/gi)];
      console.log("numbers:", [...new Set(nums.map((m) => m[0]))]);
      await worker.terminate();
    } catch (error) {
      console.error(`page ${page + 1} failed:`, error);
    }
  }
}

main().catch(console.error);
