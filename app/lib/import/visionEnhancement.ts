import { parseExercisesWithAi } from "./aiParser";
import { applyCkeSourceIdentifiers } from "./ckeIdentifier";
import { extractTextWithVisionInChild } from "./pdfVisionChild";
import {
  getImportSession,
  updateImportSession,
} from "./sessionStore";
import type { VisionEnhancementStatus } from "./types";

const activeEnhancements = new Set<string>();

export function getVisionEnhancementStatus(
  sessionId: string
): VisionEnhancementStatus | null {
  return getImportSession(sessionId)?.visionEnhancementStatus ?? null;
}

export function isVisionEnhancementRunning(sessionId: string): boolean {
  return activeEnhancements.has(sessionId);
}

export function scheduleVisionEnhancement(
  sessionId: string,
  buffer: Buffer,
  fileName: string
): void {
  if (activeEnhancements.has(sessionId)) {
    return;
  }

  activeEnhancements.add(sessionId);

  void runVisionEnhancement(sessionId, buffer, fileName).finally(() => {
    activeEnhancements.delete(sessionId);
  });
}

async function runVisionEnhancement(
  sessionId: string,
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const session = getImportSession(sessionId);

  if (!session) {
    return;
  }

  updateImportSession(sessionId, {
    visionEnhancementStatus: "running",
    parseWarnings: [
      ...session.parseWarnings,
      "Trwa ulepszanie importu Vision (wzory, obrazki, układ ABCD) — podgląd odświeży się automatycznie.",
    ],
  });

  try {
    const vision = await extractTextWithVisionInChild(buffer);
    const parsed = await parseExercisesWithAi(vision.text, {
      pazdroBlocks: vision.pazdroBlocks,
      fileName,
    });

    const current = getImportSession(sessionId);

    if (!current) {
      return;
    }

    if (parsed.exercises.length === 0) {
      updateImportSession(sessionId, {
        visionEnhancementStatus: "failed",
        parseWarnings: [
          ...current.parseWarnings,
          "Vision AI nie wykryło zadań — pozostawiono wynik parsera tekstowego.",
          ...vision.warnings,
        ],
      });
      return;
    }

    const exercises = applyCkeSourceIdentifiers(
      parsed.exercises,
      current.metadata
    );

    updateImportSession(sessionId, {
      exercises,
      extractionMethod: "vision",
      pageCount: vision.pageCount || current.pageCount,
      aiUsed: parsed.aiUsed,
      visionEnhancementStatus: "done",
      parseWarnings: [
        ...current.parseWarnings.filter(
          (warning) => !warning.startsWith("Trwa ulepszanie importu Vision")
        ),
        "Import Vision zakończony — zaktualizowano treść zadań.",
        ...parsed.warnings,
        ...vision.warnings,
      ],
    });
  } catch (error) {
    const current = getImportSession(sessionId);
    const message =
      error instanceof Error ? error.message : "Nieznany błąd Vision AI.";

    if (current) {
      updateImportSession(sessionId, {
        visionEnhancementStatus: "failed",
        parseWarnings: [
          ...current.parseWarnings,
          `Vision AI nie powiodło się — pozostawiono wynik parsera tekstowego: ${message}`,
        ],
      });
    }

    console.error(`Vision enhancement failed for session ${sessionId}:`, error);
  }
}
