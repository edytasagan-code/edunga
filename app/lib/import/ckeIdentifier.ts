import { resolveExerciseImportMetadata } from "./exerciseMetadata";
import type { ImportSessionMetadata, ParsedExercise } from "./types";

/** MAT2026-PP-001 */
export const CKE_SOURCE_IDENTIFIER_PATTERN =
  /^MAT(\d{4})-(PP|PR)-(\d{3,})$/;

export type CkeExamLevelCode = "PP" | "PR";

export function isCkeSourceIdentifier(value: string): boolean {
  return CKE_SOURCE_IDENTIFIER_PATTERN.test(value.trim());
}

export function parseCkeSourceIdentifier(value: string): {
  year: number;
  level: CkeExamLevelCode;
  exerciseNumber: number;
} | null {
  const match = value.trim().match(CKE_SOURCE_IDENTIFIER_PATTERN);

  if (!match) {
    return null;
  }

  return {
    year: Number.parseInt(match[1], 10),
    level: match[2] as CkeExamLevelCode,
    exerciseNumber: Number.parseInt(match[3], 10),
  };
}

export function normalizeCkeExamLevelCode(
  level: string | null | undefined
): CkeExamLevelCode {
  return level?.trim().toLowerCase() === "pr" ? "PR" : "PP";
}

export function buildCkeSourceIdentifier(input: {
  year: number | null | undefined;
  level: string | null | undefined;
  exerciseNumber: string | number | null | undefined;
}): string | null {
  const year = input.year;

  if (year == null || Number.isNaN(Number(year))) {
    return null;
  }

  const parsedNumber =
    typeof input.exerciseNumber === "number"
      ? input.exerciseNumber
      : Number.parseInt(String(input.exerciseNumber ?? "").trim(), 10);

  if (!parsedNumber || Number.isNaN(parsedNumber) || parsedNumber < 1) {
    return null;
  }

  const level = normalizeCkeExamLevelCode(input.level);

  return `MAT${Math.trunc(year)}-${level}-${String(parsedNumber).padStart(3, "0")}`;
}

export function formatCkeExerciseDisplayNumber(
  exerciseNumber: string | number | null | undefined
): string {
  const raw = String(exerciseNumber ?? "").trim();

  if (!raw) {
    return "Zadanie";
  }

  return `Zadanie ${raw}`;
}

export function applyCkeSourceIdentifiers(
  exercises: ParsedExercise[],
  sessionMetadata: ImportSessionMetadata
): ParsedExercise[] {
  return exercises.map((exercise) => {
    const metadata = resolveExerciseImportMetadata(
      sessionMetadata,
      exercise.metadataOverrides
    );

    if (metadata.zrodlo !== "matura") {
      if (!exercise.identifikatorZrodla) {
        return exercise;
      }

      return {
        ...exercise,
        identifikatorZrodla: null,
      };
    }

    return {
      ...exercise,
      identifikatorZrodla: buildCkeSourceIdentifier({
        year: metadata.sourceMetadata.rokEgzaminu,
        level: metadata.sourceMetadata.poziomEgzaminu,
        exerciseNumber: exercise.number ?? String(exercise.index + 1),
      }),
      identifikatorPp: null,
      identifikatorPr: null,
    };
  });
}

export function formatCkeIdentifierPreviewLine(
  identifikatorZrodla: string | null | undefined
): string | null {
  const value = identifikatorZrodla?.trim();

  return value || null;
}
