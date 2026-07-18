import { pdf } from "pdf-to-img";

import { getPdfJsDocInitParams } from "./pdfJsPaths";

import type { PazdroExerciseBlock } from "./pazdroParser";
import {
  extractExercisesFromPageImage,
  type VisionExercise,
} from "./visionExtract";
import { normalizePazdroVisionExercises } from "./pazdroIdentifier";
import { mergeVisionExercisesForImport, looksLikeCkeVisionImport } from "./maturaParser";
import type { VisionExerciseIdentifiers } from "./visionNormalize";
import { visionExercisesToPazdroBlocks } from "./visionToPazdroBlocks";
import { attachFiguresForPageExercises } from "./visionFigureAttach";
import {
  buildVisionEmptyFailureMessage,
  isFatalVisionApiError,
} from "./visionFailureMessage";

const VISION_SCALE = 2.5;
const PAGE_ERROR_PREFIX = "Vision AI — strona ";

export type VisionExtractionResult = {
  text: string;
  pageCount: number;
  warnings: string[];
  pazdroBlocks: PazdroExerciseBlock[];
};

export type VisionPipelineStages = {
  pageCount: number;
  warnings: string[];
  rawExercises: VisionExercise[];
  mergedExercises: Array<VisionExercise & VisionExerciseIdentifiers>;
  pazdroBlocks: PazdroExerciseBlock[];
};

export async function collectVisionPipelineStages(
  buffer: Buffer
): Promise<VisionPipelineStages> {
  const warnings: string[] = [];
  const allExercises: VisionExercise[] = [];
  const document = await pdf(buffer, {
    scale: VISION_SCALE,
    docInitParams: getPdfJsDocInitParams(),
  });
  let pageIndex = 0;

  for await (const image of document) {
    pageIndex += 1;
    const pageBuffer = Buffer.from(image);

    try {
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nieznany błąd Vision AI.";

      if (isFatalVisionApiError(message)) {
        throw new Error(`Vision AI: ${message}`);
      }

      warnings.push(`${PAGE_ERROR_PREFIX}${pageIndex}: ${message}`);
      console.error(`Vision extraction failed on page ${pageIndex}:`, error);
    }
  }

  if (pageIndex === 0) {
    warnings.push("Vision AI nie zwrócił żadnych stron z pliku PDF.");
  }

  const merged = mergeVisionExercisesForImport(allExercises);
  const mergedExercises = looksLikeCkeVisionImport(allExercises)
    ? merged
    : normalizePazdroVisionExercises(merged);
  const pazdroBlocks = visionExercisesToPazdroBlocks(mergedExercises);

  return {
    pageCount: pageIndex,
    warnings,
    rawExercises: allExercises,
    mergedExercises,
    pazdroBlocks,
  };
}

export async function extractTextWithVision(
  buffer: Buffer
): Promise<VisionExtractionResult> {
  const stages = await collectVisionPipelineStages(buffer);
  const text = stages.pazdroBlocks.map((block) => block.text).join("\n\n").trim();
  const warnings = [...stages.warnings];

  if (stages.pazdroBlocks.length === 0) {
    const pageErrors = stages.warnings.filter((warning) =>
      warning.startsWith(PAGE_ERROR_PREFIX)
    );

    if (stages.pageCount > 0 && pageErrors.length >= stages.pageCount) {
      throw new Error(
        buildVisionEmptyFailureMessage(stages.warnings, stages.pageCount)
      );
    }

    warnings.push(
      "Vision AI nie wykrył ćwiczeń — sprawdź podgląd importu i popraw ręcznie w razie potrzeby."
    );
  }

  return {
    text,
    pageCount: stages.pageCount,
    warnings,
    pazdroBlocks: stages.pazdroBlocks,
  };
}
