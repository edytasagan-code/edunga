/**
 * Trace answer mapping for exercises 1.39, 1.40, 1.41 across the import pipeline.
 * Diagnostic only — no fixes.
 *
 * Usage:
 *   node --import tsx scripts/diagnose-answer-pipeline.mjs [path-to.pdf]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

import { editorDocumentToPlainPreview } from "../app/lib/import/textToDocument.ts";
import { processPdfImport } from "../app/lib/import/processImport.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";
import { visionExercisesToPazdroBlocks } from "../app/lib/import/visionToPazdroBlocks.ts";
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGETS = ["1.39", "1.40", "1.41"];

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

function hasAnswerContent(document) {
  if (!document?.paragraphs?.length) {
    return false;
  }

  return document.paragraphs.some((paragraph) =>
    paragraph.children.some((node) => {
      if (node.type === "text") {
        return node.text.trim().length > 0;
      }

      if (node.type === "math") {
        return node.latex.trim().length > 0;
      }

      return false;
    })
  );
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
    const pageResult = await extractExercisesFromPageImage(
      Buffer.from(image),
      pageIndex
    );
    pages.push({
      pageIndex,
      sourcePage: pageResult.sourcePage ?? null,
      exercises: pageResult.exercises ?? [],
    });
  }

  return pages;
}

function findVisionExercise(pages, identifier) {
  for (const page of pages) {
    const exercise = page.exercises.find(
      (item) => item.identifier?.trim() === identifier
    );

    if (exercise) {
      return { pageIndex: page.pageIndex, sourcePage: page.sourcePage, exercise };
    }
  }

  return null;
}

function printSection(title) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

function printSubsection(title) {
  console.log("\n" + "-".repeat(56));
  console.log(title);
  console.log("-".repeat(56));
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

  console.log(`Diagnosing answer pipeline for ${TARGETS.join(", ")}`);
  console.log(`PDF: ${pdfPath}`);

  const buffer = readFileSync(pdfPath);

  printSection("STAGE A — RAW VISION (per page)");
  console.log("Calling Vision API (may take ~30–90s)...");

  const visionPages = await collectRawVisionByPage(buffer);
  const allVisionExercises = visionPages.flatMap((page) => page.exercises);

  for (const page of visionPages) {
    console.log(
      `\nPage ${page.pageIndex} (sourcePage=${page.sourcePage ?? "?"}) — ${page.exercises.length} exercise(s):`
    );

    for (const exercise of page.exercises) {
      const answerCount = (exercise.answers ?? []).length;
      console.log(
        `  · ${exercise.identifier} — answers: ${answerCount}${
          answerCount > 0
            ? ` [${(exercise.answers ?? [])
                .map((item) => `${item.label}=${item.value}`)
                .join(", ")}]`
            : " (empty)"
        }`
      );
    }
  }

  printSection("STAGE B — VISION → PAZDRO BLOCKS");
  const pazdroBlocks = visionExercisesToPazdroBlocks(allVisionExercises);

  for (const target of TARGETS) {
    const block = pazdroBlocks.find((item) => item.number === target);
    console.log(
      `\n${target}: ${block ? "block created" : "NOT in pazdroBlocks"}`
    );

    if (block) {
      console.log(
        `  odpowiedz in block: ${hasAnswerContent(block.odpowiedz) ? "YES" : "EMPTY"}`
      );
      if (hasAnswerContent(block.odpowiedz)) {
        console.log(
          `  preview: ${editorDocumentToPlainPreview(block.odpowiedz)}`
        );
      }
    }
  }

  printSection("STAGE C — FULL IMPORT SESSION");
  const importResult = await processPdfImport(
    pdfPath.split(/[\\/]/).pop() ?? "pazdro.pdf",
    buffer
  );

  console.log("Import result:", importResult);

  const session = getImportSession(importResult.sessionId);

  if (!session) {
    console.error("Import session not found");
    process.exit(1);
  }

  printSection("STAGE D — DATABASE (by identyfikator)");
  let dbTasks = [];

  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient();

    try {
      dbTasks = await prisma.zadanie.findMany({
        where: {
          identyfikator: { in: TARGETS },
        },
        orderBy: { createdAt: "desc" },
        select: {
          kod: true,
          identyfikator: true,
          odpowiedz: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.log(
        "Database unavailable:",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      await prisma.$disconnect();
    }
  } else {
    console.log("DATABASE_URL not set — skipping DB lookup.");
  }

  for (const target of TARGETS) {
    printSection(`EXERCISE ${target}`);

    const visionHit = findVisionExercise(visionPages, target);
    const visionExercise = visionHit?.exercise ?? null;
    const editorFromVision = visionExercise
      ? visionExerciseToEditorDocuments(visionExercise, `diag-${target}`)
      : null;
    const pazdroBlock = pazdroBlocks.find((item) => item.number === target);
    const sessionExercise = session.exercises.find(
      (item) => item.number === target
    );
    const dbTask = dbTasks.find((item) => item.identyfikator === target);

    printSubsection("1. Vision JSON for the exercise");

    if (!visionExercise) {
      console.log("NOT FOUND in Vision output.");
      console.log(
        "All Vision identifiers:",
        allVisionExercises.map((item) => item.identifier).join(", ") || "(none)"
      );
    } else {
      console.log(
        JSON.stringify(
          {
            pageIndex: visionHit.pageIndex,
            sourcePage: visionHit.sourcePage,
            exercise: visionExercise,
          },
          null,
          2
        )
      );
    }

    printSubsection("2. Detected answer block (Vision answers array)");

    if (!visionExercise) {
      console.log("(exercise missing)");
    } else if ((visionExercise.answers ?? []).length === 0) {
      console.log("[] — Vision returned no answers for this exercise.");
    } else {
      console.log(JSON.stringify(visionExercise.answers, null, 2));
    }

    printSubsection("3. EditorDocument Answer field");

    const sessionAnswer = sessionExercise?.odpowiedz ?? null;
    const conversionAnswer =
      editorFromVision?.odpowiedz ?? pazdroBlock?.odpowiedz ?? null;
    const answerDoc = sessionAnswer ?? conversionAnswer;

    if (!answerDoc) {
      console.log("No EditorDocument — exercise not found in import session.");
    } else {
      console.log("Source:", sessionAnswer ? "import session" : "Vision conversion");
      console.log("Has content:", hasAnswerContent(answerDoc));
      console.log("Plain preview:", editorDocumentToPlainPreview(answerDoc));
      console.log("JSON:", JSON.stringify(answerDoc, null, 2));
    }

    printSubsection("4. Saved database Answer field");

    if (!dbTask) {
      console.log(
        "No saved task with identyfikator=" +
          target +
          " (not imported yet or DB unavailable)."
      );
    } else {
      console.log(`Task ${dbTask.kod} (saved ${dbTask.createdAt})`);
      console.log("Has content:", hasAnswerContent(dbTask.odpowiedz));
      console.log(
        "Plain preview:",
        editorDocumentToPlainPreview(dbTask.odpowiedz)
      );
      console.log("JSON:", JSON.stringify(dbTask.odpowiedz, null, 2));
    }

    printSubsection("Stage diagnosis");

    const visionHasAnswers = (visionExercise?.answers ?? []).some(
      (item) => item.label?.trim() && item.value?.trim()
    );
    const conversionHasAnswer = hasAnswerContent(conversionAnswer);
    const sessionHasAnswer = hasAnswerContent(sessionAnswer);
    const dbHasAnswer = dbTask ? hasAnswerContent(dbTask.odpowiedz) : null;

    if (!visionExercise) {
      console.log("Loss likely in VISION or PAGE PARSING — exercise not detected.");
    } else if (!visionHasAnswers) {
      console.log(
        "Loss at VISION — exercise detected but answers array is empty."
      );
    } else if (!conversionHasAnswer) {
      console.log(
        "Loss at VISION → EditorDocument conversion — answers present in JSON but empty odpowiedz."
      );
    } else if (!sessionHasAnswer) {
      console.log(
        "Loss during PAGE PARSING / session assembly — conversion OK but session odpowiedz empty."
      );
    } else if (dbTask && !dbHasAnswer) {
      console.log(
        "Loss at DATABASE SAVE — session has answer but DB record does not."
      );
    } else if (dbTask && dbHasAnswer) {
      console.log("Answer preserved through all stages including DB save.");
    } else {
      console.log(
        "Answer present through Vision and import session (DB not checked or not saved)."
      );
    }
  }

  printSection("SUMMARY");
  console.log(
    "Vision exercises on page:",
    allVisionExercises.map((item) => item.identifier).join(", ")
  );
  console.log(
    "Import session exercises:",
    session.exercises.map((item) => item.number).join(", ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
