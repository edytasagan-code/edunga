/**
 * End-to-end pipeline dump for PP 1.171 / PR 1.188 only.
 * Diagnostic only — no fixes.
 *
 * Usage:
 *   node --import tsx scripts/diagnose-exercise-1171.mjs [path-to.pdf]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { processPdfImport } from "../app/lib/import/processImport.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";
import {
  mergePazdroDualVisionExercises,
  normalizeVisionExercise,
} from "../app/lib/import/visionNormalize.ts";
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PDF =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/Klasa 1 Pazdro 47 52.pdf";
const TARGETS = ["1.171", "1.188"];

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
  if (TARGETS.includes(exercise.number)) return true;
  if (TARGETS.includes(exercise.identifikatorPp ?? "")) return true;
  if (TARGETS.includes(exercise.identifikatorPr ?? "")) return true;
  if (TARGETS.some((t) => identifierMatches(exercise.number, t))) return true;
  return false;
}

function pickRelevantFields(exercise) {
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

function printJson(label, value) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(value, null, 2));
}

async function collectRawVisionByPage(buffer) {
  const { pdf } = await import("pdf-to-img");
  const { extractExercisesFromPageImage } = await import(
    "../app/lib/import/visionExtract.ts"
  );

  const pages = [];
  const document = await pdf(buffer, { scale: 2.5 });
  let pageIndex = 0;

  for await (const image of document) {
    pageIndex += 1;
    try {
      const pageResult = await extractExercisesFromPageImage(
        Buffer.from(image),
        pageIndex
      );
      pages.push({
        pageIndex,
        sourcePage: pageResult.sourcePage ?? null,
        exercises: pageResult.exercises ?? [],
      });
    } catch (error) {
      pages.push({
        pageIndex,
        sourcePage: null,
        error: error instanceof Error ? error.message : String(error),
        exercises: [],
      });
    }
  }

  return { pages };
}

async function main() {
  loadEnvFile();

  const pdfPath = resolve(process.argv[2] ?? DEFAULT_PDF);

  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log("=".repeat(72));
  console.log("END-TO-END DIAGNOSTIC: PP 1.171 / PR 1.188");
  console.log("=".repeat(72));
  console.log(`PDF: ${pdfPath}`);

  const buffer = readFileSync(pdfPath);
  const report = { pdfPath, stages: {} };

  // ── STAGE 1: Raw Vision JSON ──────────────────────────────────────────
  console.log("\n\nSTAGE 1 — RAW VISION JSON");
  console.log("Calling Vision API page-by-page (same as pdfVision.ts)...");

  const { pages: visionPages } = await collectRawVisionByPage(buffer);
  const allRaw = visionPages.flatMap((p) => p.exercises);
  const rawHits = allRaw.filter((ex) => exerciseMatchesTarget(ex));

  report.stages.rawVision = {
    pagesProcessed: visionPages.length,
    pageErrors: visionPages.filter((p) => p.error).map((p) => ({
      pageIndex: p.pageIndex,
      error: p.error,
    })),
    allIdentifiers: allRaw.map((e) => e.identifier),
    relevantEntries: rawHits.map((ex) => ({
      ...pickRelevantFields(ex),
      _pageIndex: visionPages.find((p) =>
        p.exercises.some((e) => e === ex)
      )?.pageIndex,
    })),
  };

  if (rawHits.length === 0) {
    printJson(
      "1. Raw Vision JSON — NO entries matching 1.171 or 1.188",
      {
        allVisionIdentifiers: allRaw.map((e) => e.identifier),
        pageErrors: report.stages.rawVision.pageErrors,
      }
    );
  } else {
    for (const [index, exercise] of rawHits.entries()) {
      printJson(`1. Raw Vision JSON — entry ${index + 1}/${rawHits.length}`, {
        pageIndex: visionPages.find((p) =>
          p.exercises.some((e) => e === exercise)
        )?.pageIndex,
        identifier: exercise.identifier,
        level: exercise.level,
        instruction: exercise.instruction,
        subtasks: exercise.subtasks ?? [],
        answers: exercise.answers ?? [],
        answer: exercise.answer ?? null,
      });
    }
  }

  // ── STAGE 2: mergePazdroDualVisionExercises ──────────────────────────
  console.log("\n\nSTAGE 2 — mergePazdroDualVisionExercises()");
  const mergedAll = mergePazdroDualVisionExercises(allRaw);
  const mergedHits = mergedAll.filter((ex) => exerciseMatchesTarget(ex));

  report.stages.afterMerge = {
    totalExercisesAfterMerge: mergedAll.length,
    relevantEntries: mergedHits.map(pickRelevantFields),
  };

  if (mergedHits.length === 0) {
    printJson("2. After merge — NO entries matching 1.171/1.188", {
      allMergedIdentifiers: mergedAll.map((e) => ({
        identifier: e.identifier,
        PP: e.sourceIdentifierBasic,
        PR: e.sourceIdentifierExtended,
        subtaskCount: (e.subtasks ?? []).length,
      })),
    });
  } else {
    for (const [index, exercise] of mergedHits.entries()) {
      printJson(`2. After merge — entry ${index + 1}/${mergedHits.length}`, {
        identifier: exercise.identifier,
        sourceIdentifierBasic: exercise.sourceIdentifierBasic,
        sourceIdentifierExtended: exercise.sourceIdentifierExtended,
        level: exercise.level,
        instruction: exercise.instruction,
        subtasks: exercise.subtasks ?? [],
        answers: exercise.answers ?? [],
      });
    }
  }

  // ── STAGE 3: normalizeVisionExercise (per raw entry) ─────────────────
  console.log("\n\nSTAGE 3 — normalizeVisionExercise() on each RAW entry");
  const normalizedRaw = rawHits.map((ex) => normalizeVisionExercise(ex));
  report.stages.normalizeRaw = normalizedRaw.map(pickRelevantFields);

  if (rawHits.length === 0) {
    console.log("(no raw entries to normalize)");
  } else {
    for (const [index, exercise] of normalizedRaw.entries()) {
      printJson(
        `3. normalizeVisionExercise — raw entry ${index + 1}`,
        pickRelevantFields(exercise)
      );
    }
  }

  // Also show normalize on merged output
  const normalizedMerged = mergedHits.map((ex) => normalizeVisionExercise(ex));
  report.stages.normalizeMerged = normalizedMerged.map(pickRelevantFields);

  if (mergedHits.length > 0) {
    for (const [index, exercise] of normalizedMerged.entries()) {
      printJson(
        `3b. normalizeVisionExercise — merged entry ${index + 1}`,
        pickRelevantFields(exercise)
      );
    }
  }

  // ── STAGE 4: Generated EditorDocument ────────────────────────────────
  console.log("\n\nSTAGE 4 — Generated EditorDocument (visionExerciseToEditorDocuments)");
  const editorFromMerged = mergedHits.map((ex) => ({
    source: pickRelevantFields(ex),
    documents: visionExerciseToEditorDocuments(ex, "diag-1171"),
  }));
  report.stages.editorDocument = editorFromMerged.map((item) => ({
    source: item.source,
    trescParagraphCount: item.documents.tresc?.paragraphs?.length ?? 0,
    tresc: item.documents.tresc,
    odpowiedz: item.documents.odpowiedz,
  }));

  if (mergedHits.length === 0) {
    console.log("(no merged entry — skipping EditorDocument)");
  } else {
    for (const [index, item] of editorFromMerged.entries()) {
      printJson(`4. EditorDocument — from merged entry ${index + 1}`, {
        sourceIdentifiers: {
          identifier: item.source.identifier,
          PP: item.source.sourceIdentifierBasic,
          PR: item.source.sourceIdentifierExtended,
        },
        subtasksInSource: (item.source.subtasks ?? []).length,
        trescParagraphCount: item.documents.tresc?.paragraphs?.length ?? 0,
        tresc: item.documents.tresc,
        odpowiedz: item.documents.odpowiedz,
      });
    }
  }

  // ── STAGE 5: Final Import Session ────────────────────────────────────
  console.log("\n\nSTAGE 5 — FULL IMPORT SESSION (processPdfImport → Preview data)");
  console.log("Running full import (Vision child worker, same as UI)...");

  const importResult = await processPdfImport(
    pdfPath.split(/[\\/]/).pop() ?? "pazdro.pdf",
    buffer
  );
  const session = getImportSession(importResult.sessionId);

  if (!session) {
    console.error("Import session not found after processPdfImport");
    process.exit(1);
  }

  const sessionHits = session.exercises.filter(sessionExerciseMatches);
  report.stages.importSession = {
    sessionId: importResult.sessionId,
    exerciseCount: session.exercises.length,
    relevantExercises: sessionHits.map((ex) => ({
      index: ex.index,
      number: ex.number,
      identifikatorPp: ex.identifikatorPp,
      identifikatorPr: ex.identifikatorPr,
      level: ex.level,
      rawText: ex.rawText,
      trescParagraphCount: ex.tresc?.paragraphs?.length ?? 0,
      tresc: ex.tresc,
      odpowiedz: ex.odpowiedz,
    })),
  };

  if (sessionHits.length === 0) {
    printJson("5. Import Session — NO exercise matching 1.171/1.188", {
      allSessionNumbers: session.exercises.map((e) => ({
        number: e.number,
        PP: e.identifikatorPp,
        PR: e.identifikatorPr,
      })),
    });
  } else {
    for (const [index, exercise] of sessionHits.entries()) {
      printJson(`5. Import Session exercise ${index + 1}/${sessionHits.length}`, {
        index: exercise.index,
        number: exercise.number,
        identifikatorPp: exercise.identifikatorPp,
        identifikatorPr: exercise.identifikatorPr,
        level: exercise.level,
        rawText: exercise.rawText,
        trescParagraphCount: exercise.tresc?.paragraphs?.length ?? 0,
        tresc: exercise.tresc,
        odpowiedz: exercise.odpowiedz,
        rozwiazanie: exercise.rozwiazanie,
      });
    }
  }

  // ── DIAGNOSIS ────────────────────────────────────────────────────────
  console.log("\n\n" + "=".repeat(72));
  console.log("STAGE-BY-STAGE DIAGNOSIS");
  console.log("=".repeat(72));

  const rawSubtaskTotal = rawHits.reduce(
    (sum, ex) => sum + (ex.subtasks?.length ?? 0),
    0
  );
  const rawResolvedSubtasks = rawHits.reduce(
    (sum, ex) =>
      sum +
      (ex.subtasks ?? []).filter(
        (s) => (s.expression?.trim() || (s.mathElements ?? []).length > 0)
      ).length,
    0
  );
  const mergedSubtaskTotal = mergedHits.reduce(
    (sum, ex) => sum + (ex.subtasks?.length ?? 0),
    0
  );
  const editorParagraphCount =
    editorFromMerged[0]?.documents.tresc?.paragraphs?.length ?? 0;
  const sessionParagraphCount = sessionHits[0]?.tresc?.paragraphs?.length ?? 0;

  console.log(`Raw Vision entries for 1.171/1.188: ${rawHits.length}`);
  console.log(`Raw subtasks (total rows): ${rawSubtaskTotal}`);
  console.log(`Raw subtasks (with expression or mathElements): ${rawResolvedSubtasks}`);
  console.log(`After merge — entries: ${mergedHits.length}, subtasks: ${mergedSubtaskTotal}`);
  console.log(`EditorDocument tresc paragraphs: ${editorParagraphCount}`);
  console.log(`Session tresc paragraphs: ${sessionParagraphCount}`);

  if (rawResolvedSubtasks === 0) {
    console.log("\n→ SUBTASK LOSS AT STAGE 1: Vision JSON has no subtasks for this exercise.");
  } else if (mergedSubtaskTotal === 0) {
    console.log("\n→ SUBTASK LOSS AT STAGE 2: mergePazdroDualVisionExercises dropped subtasks.");
  } else if (editorParagraphCount < 5) {
    console.log("\n→ SUBTASK LOSS AT STAGE 4: visionExerciseToEditorDocuments produced too few paragraphs.");
  } else if (sessionParagraphCount < 5) {
    console.log("\n→ SUBTASK LOSS AT STAGE 5: session assembly differs from EditorDocument conversion.");
  } else if (sessionHits.length > 1) {
    console.log("\n→ DUPLICATE SESSION ENTRIES: user may be viewing the empty duplicate.");
  } else {
    console.log("\n→ Subtasks present through all stages (check Preview rendering separately).");
  }

  const rawHasPp = rawHits.some((e) => identifierMatches(e.identifier, "1.171"));
  const rawHasPr = rawHits.some((e) => identifierMatches(e.identifier, "1.188"));
  const mergedPp = mergedHits[0]?.sourceIdentifierBasic;
  const mergedPr = mergedHits[0]?.sourceIdentifierExtended;
  const sessionPp = sessionHits[0]?.identifikatorPp;
  const sessionPr = sessionHits[0]?.identifikatorPr;

  console.log(`\nIdentifiers — raw has 1.171: ${rawHasPp}, raw has 1.188: ${rawHasPr}`);
  console.log(`After merge — PP: ${mergedPp ?? "null"}, PR: ${mergedPr ?? "null"}`);
  console.log(`Session — PP: ${sessionPp ?? "null"}, PR: ${sessionPr ?? "null"}`);

  if (!mergedPp && rawHasPp) {
    console.log("\n→ IDENTIFIER LOSS AT STAGE 2 or 3: PP 1.171 missing after merge/normalize.");
  }
  if (!mergedPr && rawHasPr) {
    console.log("\n→ IDENTIFIER LOSS AT STAGE 2 or 3: PR 1.188 missing after merge/normalize.");
  }
  if ((mergedPp || mergedPr) && !sessionPp && !sessionPr) {
    console.log("\n→ IDENTIFIER LOSS AT STAGE 5: identifiers not copied into session.");
  }

  const outDir = join(__dirname, "output");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "diagnose-1171-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
