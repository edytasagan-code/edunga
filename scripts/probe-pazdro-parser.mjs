import { readFileSync } from "fs";
import { extractTextWithOcr } from "../app/lib/import/pdfOcr.ts";
import { detectPazdroExercises } from "../app/lib/import/pazdroParser.ts";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const buffer = readFileSync(pdfPath);
  const ocr = await extractTextWithOcr(buffer);
  const blocks = await detectPazdroExercises(ocr.text, ocr.pages);

  console.log(`exercises: ${blocks.length}`);
  for (const block of blocks) {
    console.log(
      `${block.number} | level=${block.level ?? "unknown"} | detected=${block.levelDetected} | ${block.text.slice(0, 80).replace(/\s+/g, " ")}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
