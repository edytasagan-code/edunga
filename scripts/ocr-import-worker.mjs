import { readFileSync } from "node:fs";

import { detectPazdroExercises } from "../app/lib/import/pazdroParser.ts";
import { extractTextWithOcr, shutdownOcrWorker } from "../app/lib/import/pdfOcr.ts";

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error("Usage: ocr-import-worker.mjs <pdf-path>");
  process.exit(1);
}

async function main() {
  const buffer = readFileSync(pdfPath);
  const result = await extractTextWithOcr(buffer);
  const pazdroBlocks = await detectPazdroExercises(result.text, result.pages);

  const payload = {
    text: result.text,
    pageCount: result.pageCount,
    warnings: result.warnings,
    pazdroBlocks,
  };

  process.stdout.write(JSON.stringify(payload));
  await shutdownOcrWorker();
}

main().catch(async (error) => {
  console.error(error);
  await shutdownOcrWorker();
  process.exit(1);
});
