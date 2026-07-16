import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectVisionPipelineStages } from "../app/lib/import/pdfVision.ts";
import {
  normalizeVisionExercise,
} from "../app/lib/import/visionNormalize.ts";
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";
import { processPdfImport } from "../app/lib/import/processImport.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGETS = ["1.171", "1.188"];

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

function identifierMatches(identifier, target) {
  const id = identifier?.trim() ?? "";
  if (id === target) return true;
  return id.split(/\s+/).includes(target);
}

function exerciseMatchesTarget(exercise) {
  const id = exercise.identifier?.trim() ?? "";
  if (TARGETS.some((t) => identifierMatches(id, t))) return true;
  if (TARGETS.includes(exercise.sourceIdentifierBasic ?? "")) return true;
  if (TARGETS.includes(exercise.sourceIdentifierExtended ?? "")) return true;
  return false;
}

function sessionExerciseMatches(exercise) {
  if (TARGETS.some((t) => identifierMatches(exercise.number, t))) return true;
  if (TARGETS.includes(exercise.identifikatorPp ?? "")) return true;
  if (TARGETS.includes(exercise.identifikatorPr ?? "")) return true;
  return false;
}

function pickFields(exercise) {
  if (!exercise) return null;
  return {
    identifier: exercise.identifier ?? null,
    level: exercise.level ?? null,
    instruction: exercise.instruction ?? null,
    subtasks: exercise.subtasks ?? [],
    answers: exercise.answers ?? [],
    answer: exercise.answer ?? null,
    sourceIdentifierBasic: exercise.sourceIdentifierBasic ?? null,
    sourceIdentifierExtended: exercise.sourceIdentifierExtended ?? null,
  };
}

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error("Usage: diagnose-exercise-1171-worker.mjs <pdf-path>");
  process.exit(1);
}

async function main() {
  loadEnvFile();
  const buffer = readFileSync(pdfPath);
  const fileName = pdfPath.split(/[\\/]/).pop() ?? "pazdro.pdf";

  const pipeline = await collectVisionPipelineStages(buffer);
  const rawHits = pipeline.rawExercises.filter(exerciseMatchesTarget);
  const mergedHits = pipeline.mergedExercises.filter(exerciseMatchesTarget);

  const normalizedRaw = rawHits.map((exercise) =>
    normalizeVisionExercise(exercise)
  );
  const normalizedMerged = mergedHits.map((exercise) =>
    normalizeVisionExercise(exercise)
  );

  const editorDocuments = mergedHits.map((exercise) =>
    visionExerciseToEditorDocuments(exercise, "diag-1171")
  );

  const importResult = await processPdfImport(fileName, buffer);
  const session = getImportSession(importResult.sessionId);
  const sessionHits =
    session?.exercises.filter(sessionExerciseMatches) ?? [];

  const report = {
    pdfPath,
    stage1_rawVision: rawHits.map(pickFields),
    stage2_afterMerge: mergedHits.map(pickFields),
    stage3_normalizeRaw: normalizedRaw.map(pickFields),
    stage3b_normalizeMerged: normalizedMerged.map(pickFields),
    stage4_editorDocument: mergedHits.map((exercise, index) => ({
      source: pickFields(exercise),
      trescParagraphCount:
        editorDocuments[index]?.tresc?.paragraphs?.length ?? 0,
      tresc: editorDocuments[index]?.tresc ?? null,
      odpowiedz: editorDocuments[index]?.odpowiedz ?? null,
    })),
    stage5_importSession: sessionHits.map((exercise) => ({
      index: exercise.index,
      number: exercise.number,
      identifikatorPp: exercise.identifikatorPp,
      identifikatorPr: exercise.identifikatorPr,
      level: exercise.level,
      rawText: exercise.rawText,
      trescParagraphCount: exercise.tresc?.paragraphs?.length ?? 0,
      tresc: exercise.tresc,
      odpowiedz: exercise.odpowiedz,
    })),
    diagnosis: {
      rawEntryCount: rawHits.length,
      rawSubtaskCount: rawHits.reduce(
        (sum, ex) => sum + (ex.subtasks?.length ?? 0),
        0
      ),
      mergedSubtaskCount: mergedHits.reduce(
        (sum, ex) => sum + (ex.subtasks?.length ?? 0),
        0
      ),
      editorParagraphCount:
        editorDocuments[0]?.tresc?.paragraphs?.length ?? 0,
      sessionParagraphCount: sessionHits[0]?.tresc?.paragraphs?.length ?? 0,
      allRawIdentifiers: pipeline.rawExercises.map((ex) => ex.identifier),
      allMergedIdentifiers: pipeline.mergedExercises.map((ex) => ({
        identifier: ex.identifier,
        PP: ex.sourceIdentifierBasic,
        PR: ex.sourceIdentifierExtended,
        subtasks: ex.subtasks?.length ?? 0,
      })),
    },
  };

  process.stdout.write(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
