/**
 * Full pipeline trace for exercise 1.40 (diagnostic only — no fixes).
 *
 * Usage:
 *   node --import tsx scripts/diagnose-exercise-140.mjs [path-to.pdf]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import katex from "katex";

import { extractTextWithVision } from "../app/lib/import/pdfVision.ts";
import { visionExpressionToLatex } from "../app/lib/import/visionNotationToLatex.ts";
import { visionExerciseToEditorDocument } from "../app/lib/import/visionToEditorDocument.ts";
import { latexForReadOnlyDisplay } from "../app/lib/math/sanitizeMathLatex.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "poc", "output");

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

function renderWithKatex(latex) {
  const displayLatex = latexForReadOnlyDisplay(latex);

  try {
    const html = katex.renderToString(displayLatex, {
      throwOnError: true,
      output: "html",
      displayMode: false,
    });

    return { ok: true, html };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function findExercise140(exercises) {
  return (
    exercises.find((exercise) => exercise.identifier?.trim() === "1.40") ??
    null
  );
}

async function collectRawVisionExercises(buffer) {
  const { pdf } = await import("pdf-to-img");
  const { extractExercisesFromPageImage } = await import(
    "../app/lib/import/visionExtract.ts"
  );

  const allExercises = [];
  const document = await pdf(buffer, { scale: 2.5 });
  let pageIndex = 0;

  for await (const image of document) {
    pageIndex += 1;
    const pageResult = await extractExercisesFromPageImage(
      Buffer.from(image),
      pageIndex
    );
    allExercises.push(...pageResult.exercises);
  }

  return allExercises;
}

function traceSubtask(subtask, subtaskIndex, editorDocument) {
  const visionJson = {
    label: subtask.label,
    expression: subtask.expression,
    mathElements: subtask.mathElements ?? [],
  };

  const visionLatex = visionExpressionToLatex(subtask.expression);

  const paragraph = editorDocument.paragraphs[subtaskIndex + 1] ?? null;

  const labelNode = paragraph?.children.find((node) => node.type === "text");
  const mathNode = paragraph?.children.find((node) => node.type === "math");

  const mathNodeLatex = mathNode?.type === "math" ? mathNode.latex : null;
  const katexRender = mathNodeLatex ? renderWithKatex(mathNodeLatex) : null;

  return {
    visionJson,
    visionNotationToLatex: visionLatex,
    editorDocumentParagraph: paragraph ?? null,
    mathNode: mathNode ?? null,
    mathliveInputLatex: mathNodeLatex,
    previewRender: {
      engine: "KaTeX (Import Preview / DocumentViewer — same latex as MathLive input)",
      sanitizedLatex: mathNodeLatex
        ? latexForReadOnlyDisplay(mathNodeLatex)
        : null,
      katex: katexRender,
    },
  };
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

  console.log(`Diagnosing exercise 1.40 from: ${pdfPath}\n`);

  const buffer = readFileSync(pdfPath);

  console.log("Calling Vision API (this may take ~30s)...\n");
  const rawExercises = await collectRawVisionExercises(buffer);
  const exercise140 = findExercise140(rawExercises);

  if (!exercise140) {
    console.error(
      "Exercise 1.40 not found in Vision output. Identifiers:",
      rawExercises.map((item) => item.identifier).join(", ")
    );
    process.exit(1);
  }

  const editorDocument = visionExerciseToEditorDocument(
    exercise140,
    "diag-140"
  );

  const subtasks = (exercise140.subtasks ?? []).map((subtask, index) =>
    traceSubtask(subtask, index, editorDocument)
  );

  const report = {
    diagnosedAt: new Date().toISOString(),
    pdfPath,
    exercise140VisionJson: exercise140,
    instruction: exercise140.instruction,
    answers: exercise140.answers,
    subtasks,
    fullEditorDocument: editorDocument,
    pipelineNotes: [
      "Stage 1: exercise140VisionJson.subtasks[].expression = raw Vision JSON per subtask",
      "Stage 2: subtasks[].visionNotationToLatex = visionNotationToLatex() output",
      "Stage 3: subtasks[].editorDocumentParagraph + fullEditorDocument = EditorDocument generation",
      "Stage 4: subtasks[].mathliveInputLatex = latex stored in MathNode (MathLive editor input)",
      "Stage 4 preview: subtasks[].previewRender = KaTeX render of same latex (Import Preview UI)",
    ],
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(
    OUTPUT_DIR,
    `diagnose-exercise-140-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("=".repeat(72));
  console.log("EXERCISE 1.40 — FULL PIPELINE TRACE");
  console.log("=".repeat(72));
  console.log(`Instruction: ${exercise140.instruction}\n`);

  for (const item of subtasks) {
    console.log("-".repeat(72));
    console.log(`SUBTASK ${item.visionJson.label})`);
    console.log("-".repeat(72));
    console.log("\n1. RAW VISION JSON:");
    console.log(JSON.stringify(item.visionJson, null, 2));
    console.log("\n2. visionNotationToLatex():");
    console.log(item.visionNotationToLatex);
    console.log("\n3. GENERATED EDITOR DOCUMENT (paragraph):");
    console.log(JSON.stringify(item.editorDocumentParagraph, null, 2));
    console.log("\n4. MATHLIVE INPUT LATEX (MathNode.latex):");
    console.log(item.mathliveInputLatex ?? "(missing MathNode)");
    console.log("\n4b. PREVIEW RENDER (KaTeX — Import Preview UI):");
    if (item.previewRender.katex?.ok) {
      console.log("KaTeX OK — sanitized latex:");
      console.log(item.previewRender.sanitizedLatex);
      console.log("HTML snippet:", item.previewRender.katex.html?.slice(0, 200));
    } else {
      console.log("KaTeX ERROR:", item.previewRender.katex?.error ?? "no math node");
    }
    console.log("");
  }

  console.log("=".repeat(72));
  console.log(`Full report saved to: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
