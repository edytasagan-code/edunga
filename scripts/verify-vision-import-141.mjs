/**
 * Verify Vision extraction for Pazdro exercise 1.41.
 *
 * Usage:
 *   node --import tsx scripts/verify-vision-import-141.mjs [path-to.pdf]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { editorDocumentToPlainPreview } from "../app/lib/import/textToDocument.ts";
import { countMathNodes } from "../app/lib/import/visionToEditorDocument.ts";
import { processPdfImport } from "../app/lib/import/processImport.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = join(__dirname, "..", ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

async function main() {
  loadEnvFile();

  const pdfPath = resolve(
    process.argv[2] ??
      "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf"
  );

  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Processing: ${pdfPath}`);

  const buffer = readFileSync(pdfPath);
  const result = await processPdfImport(
    pdfPath.split(/[\\/]/).pop() ?? "pazdro.pdf",
    buffer
  );

  check("Extraction method is vision", result.extractionMethod === "vision");
  console.log("Process result:", result);

  const session = getImportSession(result.sessionId);

  if (!session) {
    console.error("Session not found");
    process.exit(1);
  }

  const exercise = session.exercises.find((item) => item.number === "1.41");

  check("Exercise 1.41 detected", Boolean(exercise));

  if (!exercise) {
    console.log(
      "Available exercises:",
      session.exercises.map((item) => item.number).join(", ")
    );
    process.exit(1);
  }

  const preview = editorDocumentToPlainPreview(exercise.tresc);

  console.log("\n--- Exercise 1.41 preview (tresc) ---");
  console.log(preview);
  console.log("---\n");

  check("Level extended", exercise.level === "extended");
  check("Level detected", exercise.levelDetected === true);
  check("Mixed number -1 3/4", /-1\s+3\/4/.test(preview));
  check("Mixed number 3 5/6", /3\s+5\/6/.test(preview));
  check("Square root √6", /√6/.test(preview));
  check("Multiplication dot ·", /·/.test(preview));
  check("Answer -115", /-115/.test(preview));
  check("Answer 1,5", /1,5/.test(preview));
  check(
    "Structured MathNodes in tresc",
    countMathNodes(exercise.tresc) >= 8,
    `mathNodes=${countMathNodes(exercise.tresc)}`
  );
  check(
    "No math in instruction TextNode",
    exercise.tresc.paragraphs[0]?.children.every(
      (node) => node.type === "text"
    ) ?? false
  );
  check(
    "No math reconstruction",
    exercise.mathReconstructed === false,
    `method=${exercise.mathReconstructionMethod ?? "none"}`
  );

  console.log(`\nPreview URL: http://localhost:3000/nauczyciel/import/${result.sessionId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
