import { readFileSync } from "fs";
import { createCanvas, loadImage } from "canvas";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";
import { detectLevelFromImageRegion } from "../app/lib/import/levelDetect.ts";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

function collectWords(blocks) {
  const words = [];

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push(word);
        }
      }
    }
  }

  return words;
}

async function main() {
  const document = await pdf(readFileSync(pdfPath), { scale: 2.5 });
  const worker = await createWorker("pol+eng");
  let pageNum = 0;

  for await (const image of document) {
    pageNum += 1;
    const result = await worker.recognize(image, {}, { blocks: true });
    const words = collectWords(result.data.blocks);
    const targets = words.filter((w) => /^1\.\d{1,3}\.$/.test(w.text));

    for (const word of targets) {
      const level = await detectLevelFromImageRegion(
        Buffer.from(image),
        word.bbox
      );
      console.log(`PAGE ${pageNum} ${word.text} -> ${level ?? "unknown"}`);
    }
  }

  await worker.terminate();
}

main().catch(console.error);
