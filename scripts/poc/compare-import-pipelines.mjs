/**
 * PoC evaluation: Vision AI vs OCR on the same textbook page image.
 *
 * Usage:
 *   node scripts/poc/compare-import-pipelines.mjs
 *   node scripts/poc/compare-import-pipelines.mjs path/to/page.png
 *
 * Requires OPENAI_API_KEY for the vision branch.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractExercisesWithOcr } from "./lib/ocrBaseline.mjs";
import { extractExercisesWithVision } from "./lib/visionExtract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IMAGE = join(
  __dirname,
  "..",
  "fixtures",
  "poc-textbook-page-1.41.png"
);
const OUTPUT_DIR = join(__dirname, "output");

function loadEnvFile() {
  const envPath = join(__dirname, "..", "..", ".env");

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

loadEnvFile();

function printSection(title) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(title);
  console.log("=".repeat(72));
}

function summarizeVision(vision) {
  const exercises = vision.result.exercises ?? [];

  console.log(`Model: ${vision.model}`);
  console.log(`Duration: ${vision.durationMs} ms`);
  console.log(`Exercises detected: ${exercises.length}`);

  for (const exercise of exercises) {
    console.log(`\n--- ${exercise.identifier ?? "?"} ---`);
    console.log(`Instruction: ${exercise.instruction ?? ""}`);
    console.log(`Level: ${exercise.level ?? "unknown"}`);
    console.log(`Subtasks: ${(exercise.subtasks ?? []).length}`);

    for (const subtask of exercise.subtasks ?? []) {
      console.log(
        `  ${subtask.label}) ${subtask.expression ?? subtask.mathElements?.join(" · ")}`
      );
    }

    if (exercise.answers?.length) {
      console.log(
        `Answers: ${exercise.answers.map((item) => `${item.label}) ${item.value}`).join(" | ")}`
      );
    }
  }
}

function summarizeOcr(ocr) {
  console.log(`Duration: ${ocr.durationMs} ms`);
  console.log(`Raw text length: ${ocr.result.rawText.length} chars`);
  console.log(`Detected numbers: ${ocr.result.detectedNumbers.join(", ") || "—"}`);
  console.log(`Subtask lines: ${ocr.result.subtaskLineCount}`);
  console.log("\nRaw OCR text:");
  console.log(ocr.result.rawText || "(empty)");
}

async function main() {
  const imagePath = resolve(process.argv[2] ?? DEFAULT_IMAGE);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  printSection(`INPUT: ${imagePath}`);

  printSection("PIPELINE A — OCR (Tesseract baseline)");
  const ocr = await extractExercisesWithOcr(imagePath);
  summarizeOcr(ocr);

  let vision = null;
  let visionError = null;

  printSection("PIPELINE B — Vision AI (multimodal, no OCR)");
  try {
    vision = await extractExercisesWithVision(imagePath);
    summarizeVision(vision);
  } catch (error) {
    visionError =
      error instanceof Error ? error.message : String(error);
    console.error(`Vision PoC failed: ${visionError}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = {
    evaluatedAt: new Date().toISOString(),
    imagePath,
    ocr,
    vision,
    visionError,
    comparisonNotes: [
      "Vision analyzes the page image directly — no OCR step.",
      "OCR returns raw text only; math structure is often lost or corrupted.",
      "Compare subtask expressions and answers for exercise 1.41.",
    ],
  };

  const jsonPath = join(OUTPUT_DIR, `comparison-${timestamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  printSection("OUTPUT");
  console.log(`Full report saved to: ${jsonPath}`);

  if (vision) {
    const visionPath = join(OUTPUT_DIR, `vision-${timestamp}.json`);
    writeFileSync(
      visionPath,
      JSON.stringify(vision.result, null, 2),
      "utf8"
    );
    console.log(`Vision JSON saved to: ${visionPath}`);
  }

  if (visionError) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
