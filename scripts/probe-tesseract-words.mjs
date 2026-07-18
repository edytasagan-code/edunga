import { readFileSync } from "fs";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";

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
    console.log(`PAGE ${pageNum} words: ${words.length}`);
    console.log(
      words
        .filter((w) => /1\./.test(w.text))
        .map((w) => `${w.text}@${w.bbox.x0},${w.bbox.y0}`)
        .join(" | ")
    );
  }

  await worker.terminate();
}

main().catch(console.error);
