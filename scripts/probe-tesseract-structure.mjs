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
    console.log(`PAGE ${pageNum}`);
    console.log("words:", result.data.words?.length ?? 0);
    console.log("lines:", result.data.lines?.length ?? 0);
    console.log("symbols:", result.data.symbols?.length ?? 0);
    console.log("first words:", (result.data.words ?? []).slice(0, 15).map((w) => w.text));
    console.log("first lines:", (result.data.lines ?? []).slice(0, 8).map((l) => l.text));
  }

  await worker.terminate();
}

main().catch(console.error);
