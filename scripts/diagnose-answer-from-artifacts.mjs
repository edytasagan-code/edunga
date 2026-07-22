/**
 * Offline pipeline trace using saved diagnostic artifacts + live Vision fixture.
 * Use when full PDF rendering fails locally.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";
import { visionExercisesToPazdroBlocks } from "../app/lib/import/visionToPazdroBlocks.ts";
import { editorDocumentToPlainPreview } from "../app/lib/import/textToDocument.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function hasContent(doc) {
  return (
    doc?.paragraphs?.some((p) =>
      p.children.some((n) =>
        n.type === "text"
          ? n.text.trim().length > 0
          : n.type === "math"
            ? n.latex.trim().length > 0
            : false
      )
    ) ?? false
  );
}

function printExerciseReport(identifier, visionExercise, source) {
  console.log("\n" + "=".repeat(72));
  console.log(`EXERCISE ${identifier} (source: ${source})`);
  console.log("=".repeat(72));

  console.log("\n1. Vision JSON:");
  console.log(JSON.stringify(visionExercise, null, 2));

  console.log("\n2. Detected answer block (Vision answers array):");
  const answers = visionExercise?.answers ?? [];
  console.log(
    answers.length === 0
      ? "[] — empty"
      : JSON.stringify(answers, null, 2)
  );

  const docs = visionExercise
    ? visionExerciseToEditorDocuments(visionExercise, `artifact-${identifier}`)
    : null;
  const blocks = visionExercise
    ? visionExercisesToPazdroBlocks([visionExercise])
    : [];

  console.log("\n3. EditorDocument Answer field (Vision → conversion):");
  if (!docs) {
    console.log("(no Vision exercise data)");
  } else {
    console.log("Has content:", hasContent(docs.odpowiedz));
    console.log("Preview:", editorDocumentToPlainPreview(docs.odpowiedz));
    console.log(JSON.stringify(docs.odpowiedz, null, 2));
  }

  console.log("\n4. Pazdro block odpowiedz (page parsing output):");
  const block = blocks[0];
  if (!block) {
    console.log("(block not created)");
  } else {
    console.log("Has content:", hasContent(block.odpowiedz));
    console.log("Preview:", editorDocumentToPlainPreview(block.odpowiedz));
  }

  const visionHasAnswers = answers.some(
    (a) => a.label?.trim() && a.value?.trim()
  );
  const conversionHas = docs ? hasContent(docs.odpowiedz) : false;

  console.log("\nStage diagnosis:");
  if (!visionExercise) {
    console.log("No Vision data for this exercise.");
  } else if (!visionHasAnswers) {
    console.log("→ Loss at VISION (answers array empty).");
  } else if (!conversionHas) {
    console.log("→ Loss at Vision → EditorDocument conversion.");
  } else {
    console.log(
      "→ Answers OK through conversion; any loss would be in session assembly or DB save."
    );
  }
}

const diag140 = JSON.parse(
  readFileSync(
    join(
      __dirname,
      "poc/output/diagnose-exercise-140-2026-07-11T09-28-07-753Z.json"
    ),
    "utf8"
  )
);

const vision141 = JSON.parse(
  readFileSync(
    join(__dirname, "poc/output/vision-2026-07-11T07-57-14-211Z.json"),
    "utf8"
  )
).exercises[0];

printExerciseReport(
  "1.40",
  diag140.exercise140VisionJson,
  "full PDF Vision run (2026-07-11 diagnose-exercise-140)"
);

printExerciseReport(
  "1.41",
  vision141,
  "PoC page fixture vision-2026-07-11T07-57-14-211Z.json"
);

console.log("\n" + "=".repeat(72));
console.log("EXERCISE 1.39");
console.log("=".repeat(72));
console.log(`
No saved Vision JSON artifact for exercise 1.39 as a standalone exercise.

On the PoC page fixture, Vision returns only identifier "1.41" with
sectionReference "1.39" — the "1.39" header on the page is treated as a
section reference, not a separate exercise with its own answers array.

When a PDF page contains multiple exercises (1.39, 1.40, 1.41), Pazdro
typically prints one shared "Odp." block at the bottom. Vision appears to
attach that block only to the last exercise on the page (1.41), leaving
earlier exercises with answers: [].
`);
