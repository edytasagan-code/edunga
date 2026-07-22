import type { ParsedExercise } from "./types";
import type { VisionExercise } from "./visionExtract";
import type { VisionExerciseIdentifiers } from "./visionNormalize";
import { resolvePazdroIdentifiers } from "./visionNormalize";

export function isFullPazdroIdentifier(value: string): boolean {
  return /^\d+\.\d+$/.test(value.trim());
}

export function normalizePazdroExerciseIdentifiers<
  T extends VisionExercise & VisionExerciseIdentifiers,
>(exercise: T): T {
  const pair = resolvePazdroIdentifiers(
    exercise.identifier,
    exercise.sourceIdentifierBasic,
    exercise.sourceIdentifierExtended
  );

  return {
    ...exercise,
    sourceIdentifierBasic: pair.identifikatorPp,
    sourceIdentifierExtended: pair.identifikatorPr,
  };
}

export function normalizePazdroVisionExercises<
  T extends VisionExercise & VisionExerciseIdentifiers,
>(exercises: T[]): T[] {
  return exercises.map((exercise) => normalizePazdroExerciseIdentifiers(exercise));
}

export function normalizeParsedExercisePazdroIdentifiers(
  exercise: ParsedExercise,
  _siblings?: ParsedExercise[]
): ParsedExercise {
  if (exercise.identifikatorZrodla?.trim()) {
    return {
      ...exercise,
      identifikatorPp: null,
      identifikatorPr: null,
    };
  }

  const number = exercise.number?.trim() ?? "";
  const looksLikePazdro =
    isFullPazdroIdentifier(number) ||
    isFullPazdroIdentifier(exercise.identifikatorPp ?? "") ||
    isFullPazdroIdentifier(exercise.identifikatorPr ?? "");

  if (!looksLikePazdro) {
    return {
      ...exercise,
      identifikatorPp: null,
      identifikatorPr: null,
    };
  }

  const pair = resolvePazdroIdentifiers(
    exercise.number,
    exercise.identifikatorPp,
    exercise.identifikatorPr
  );

  return {
    ...exercise,
    identifikatorPp: pair.identifikatorPp,
    identifikatorPr: pair.identifikatorPr,
  };
}

export function normalizeParsedExercisesPazdroIdentifiers(
  exercises: ParsedExercise[]
): ParsedExercise[] {
  return exercises.map((exercise) =>
    normalizeParsedExercisePazdroIdentifiers(exercise)
  );
}
