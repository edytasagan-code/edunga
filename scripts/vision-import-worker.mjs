/**
 * Vision import worker — processes a PDF through the Vision pipeline.
 *
 * Default: mock Vision (no OpenAI). Set CKE_IMPORT_LIVE_VISION=1 for live API.
 * Diagnose mode (extra args) also requires live Vision opt-in.
 *
 * Usage:
 *   node --import tsx scripts/vision-import-worker.mjs <pdf-path>
 *   CKE_IMPORT_LIVE_VISION=1 node --import tsx scripts/vision-import-worker.mjs <pdf> 18
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { attachFiguresForPageExercises } from "../app/lib/import/visionFigureAttach.ts";
import { extractTextWithVision } from "../app/lib/import/pdfVision.ts";
import { extractExercisesFromPageImage } from "../app/lib/import/visionExtract.ts";
import {
  countImageNodes,
  visionExerciseToEditorDocuments,
} from "../app/lib/import/visionToEditorDocument.ts";
import { editorDocumentToPlainPreview } from "../app/lib/import/textToDocument.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const pdfPath = process.argv[2];
const diagnoseTargets = process.argv.slice(3);

if (!pdfPath) {
  console.error("Usage: vision-import-worker.mjs <pdf-path> [diagnose-id ...]");
  process.exit(1);
}

async function main() {
  loadEnvFile();
  const buffer = readFileSync(pdfPath);

  if (diagnoseTargets.length > 0) {
    const { pdf } = await import("pdf-to-img");
    const document = await pdf(buffer, { scale: 2.5 });
    let pageIndex = 0;
    const allExercises = [];

    for await (const image of document) {
      pageIndex += 1;
      const pageBuffer = Buffer.from(image);
      const pageResult = await extractExercisesFromPageImage(
        pageBuffer,
        pageIndex
      );
      const withFigures = await attachFiguresForPageExercises(
        pageResult.exercises,
        pageIndex,
        pageBuffer
      );
      allExercises.push(...withFigures);
    }

    for (const target of diagnoseTargets) {
      const exercise = allExercises.find(
        (item) => item.identifier?.trim() === target
      );

      console.log("\n" + "=".repeat(72));
      console.log(`VISION DIAGNOSE ${target}`);
      console.log("=".repeat(72));
      console.log("\n1. Vision JSON (with cropped figure src when present):");
      console.log(JSON.stringify(exercise ?? null, null, 2));
      console.log("\n2. Detected answer block:");
      console.log(JSON.stringify(exercise?.answers ?? [], null, 2));

      if (exercise) {
        const docs = visionExerciseToEditorDocuments(
          exercise,
          `worker-${target}`
        );
        console.log("\n3. EditorDocument tresc image nodes:");
        console.log(`count=${countImageNodes(docs.tresc)}`);
        console.log("\n4. EditorDocument Answer:");
        console.log(editorDocumentToPlainPreview(docs.odpowiedz));
        console.log(JSON.stringify(docs.odpowiedz, null, 2));
      }
    }

    return;
  }

  const result = await extractTextWithVision(buffer);

  const payload = {
    text: result.text,
    pageCount: result.pageCount,
    warnings: result.warnings,
    pazdroBlocks: result.pazdroBlocks,
  };

  process.stdout.write(JSON.stringify(payload));
}

main().catch((error) => {
  const payload = {
    error: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(1);
});
