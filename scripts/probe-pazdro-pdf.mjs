import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const buf = readFileSync(pdfPath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  console.log("pages:", result.total);
  console.log("chars:", result.text.length);
  console.log("--- first 4000 chars ---");
  console.log(result.text.slice(0, 4000));
  console.log("--- sample exercise numbers ---");
  const matches = [...result.text.matchAll(/\b1\.\d{1,3}\b/g)];
  console.log("1.xxx count:", matches.length);
  console.log("samples:", [...new Set(matches.map((m) => m[0]))].slice(0, 20));
  await parser.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
