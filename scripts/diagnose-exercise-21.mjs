/**
 * Pipeline stage dump for exercise 21 (set notation).
 * Usage: node --import tsx scripts/diagnose-exercise-21.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { collectVisionPipelineStages } from "../app/lib/import/pdfVision.ts";
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";
import { inlineContentToInlineNodes } from "../app/lib/import/visionInlineMath.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function nodesToString(nodes) {
  return nodes
    .map((node) =>
      node.type === "math" ? `[M:${node.latex}]` : node.text
    )
    .join("");
}

loadEnvFile();

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/Klasa 1 Pazdro 47 52.pdf";

if (!existsSync(pdfPath)) {
  console.error("PDF not found:", pdfPath);
  process.exit(1);
}

console.log("Running Vision extraction (may take ~60s)...\n");
const stages = await collectVisionPipelineStages(readFileSync(pdfPath));

const matches = stages.mergedExercises.filter((exercise) =>
  /zbiór|zbior/i.test(exercise.instruction ?? "")
);

if (matches.length === 0) {
  console.log("No set exercise found. Identifiers:");
  console.log(stages.mergedExercises.map((exercise) => exercise.identifier).join(", "));
  process.exit(0);
}

for (const exercise of matches) {
  console.log("=== STAGE 1: Raw Vision JSON (merged) ===");
  console.log("identifier:", exercise.identifier);
  console.log("instruction:", exercise.instruction);
  console.log("answers:", JSON.stringify(exercise.answers, null, 2));

  const documents = visionExerciseToEditorDocuments(exercise, "ex21");
  console.log("\n=== STAGE 2: EditorDocument ===");
  console.log(
    "instruction:",
    nodesToString(documents.tresc.paragraphs[0]?.children ?? [])
  );
  console.log(
    "answer:",
    nodesToString(documents.odpowiedz.paragraphs[0]?.children ?? [])
  );

  console.log("\n=== STAGE 3: Inline parser on answer values ===");
  for (const answer of exercise.answers ?? []) {
    const nodes = inlineContentToInlineNodes(
      answer.value,
      [],
      (text) => ({ type: "text", text }),
      (latex) => ({ type: "math", latex })
    );
    console.log(`answer ${answer.label}:`, nodesToString(nodes));
  }
}
