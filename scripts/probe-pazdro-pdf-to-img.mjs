import { readFileSync } from "fs";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const document = await pdf(readFileSync(pdfPath), { scale: 2.5 });
  const worker = await createWorker("pol+eng");
  let pageNum = 0;

  for await (const image of document) {
    pageNum += 1;
    const result = await worker.recognize(image);
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
