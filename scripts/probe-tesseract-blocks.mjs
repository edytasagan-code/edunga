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
    const result = await worker.recognize(image, {}, { blocks: true });
    console.log(`PAGE ${pageNum}`);
    console.log(JSON.stringify(result.data.blocks?.slice(0, 2), null, 2).slice(0, 2000));
  }

  await worker.terminate();
}

main().catch(console.error);
