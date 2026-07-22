import { readFileSync } from "fs";
import { extractTextWithOcr } from "../app/lib/import/pdfOcr.ts";
import { findExerciseNumberWord } from "../app/lib/import/levelDetect.ts";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const buffer = readFileSync(pdfPath);
  const ocr = await extractTextWithOcr(buffer);

  for (const page of ocr.pages) {
    console.log(`\nPAGE ${page.pageIndex}`);
    const nums = page.words.filter((w) => /1\.\d/.test(w.text));
    console.log(
      "number-like words:",
      nums.map((w) => w.text).join(", ")
    );

    for (const target of ["1.39", "1.40", "1.148", "1.155"]) {
      const word = findExerciseNumberWord(page.words, target);
      console.log(`${target}:`, word?.text ?? "NOT FOUND");
    }
  }
}

main().catch(console.error);
