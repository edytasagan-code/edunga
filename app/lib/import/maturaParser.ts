import type { VisionExercise, VisionSubtask } from "./visionExtract";
import { inferVisionExerciseKind } from "./fillBlankDetect";
import {
  formatSubtaskPlainContent,
  mergePazdroDualVisionExercises,
  normalizeVisionExercise,
  subtaskHasContent,
  collectExerciseBodyParagraphs,
} from "./visionNormalize";
import type { VisionExerciseIdentifiers } from "./visionNormalize";

const CKE_IDENTIFIER_PATTERN =
  /^(?:Zadanie\s+)?(\d{1,2})(?:\.(\d+))?[.)]?\s*$/i;
const PAZDRO_IDENTIFIER_PATTERN = /^\d+\.\d{1,3}(?:\s+\d+\.\d{1,3})?$/;
const ROMAN_SUBTASK_PATTERN = /^(I{1,3}|IV|V|VI{0,3}|IX|X)$/i;

export function isRomanSubtaskLabel(label: string): boolean {
  return ROMAN_SUBTASK_PATTERN.test(label.trim());
}

export function isCkeStyleIdentifier(identifier: string | undefined): boolean {
  const trimmed = identifier?.trim() ?? "";

  if (!trimmed) {
    return false;
  }

  if (PAZDRO_IDENTIFIER_PATTERN.test(trimmed)) {
    return false;
  }

  return CKE_IDENTIFIER_PATTERN.test(trimmed) || /^\d{1,2}$/.test(trimmed);
}

export function normalizeCkeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  const match = trimmed.match(CKE_IDENTIFIER_PATTERN);

  if (match) {
    const base = match[1];
    const part = match[2];

    return part ? `${base}.${part}` : base;
  }

  const bare = trimmed.match(/^(\d{1,2})$/);

  if (bare) {
    return bare[1];
  }

  return trimmed;
}

export function getCkeParentNumber(identifier: string): string {
  const normalized = normalizeCkeIdentifier(identifier);
  const multipart = normalized.match(/^(\d{1,2})\.(\d+)$/);

  if (multipart) {
    return multipart[1];
  }

  return normalized;
}

export function getCkePartNumber(identifier: string): string | null {
  const normalized = normalizeCkeIdentifier(identifier);
  const multipart = normalized.match(/^\d{1,2}\.(\d+)$/);

  return multipart?.[1] ?? null;
}

export function formatCkeNumberingPrefix(identifier: string): string {
  const normalized = normalizeCkeIdentifier(identifier);
  const parent = getCkeParentNumber(normalized);

  return `Zadanie ${parent}.`;
}

export function instructionAlreadyHasNumber(
  instruction: string,
  identifier: string
): boolean {
  const parent = getCkeParentNumber(identifier);
  const trimmed = instruction.trim();

  if (!trimmed || !parent) {
    return false;
  }

  const patterns = [
    new RegExp(`^Zadanie\\s+${parent}\\b`, "i"),
    new RegExp(`^${parent}[.)]\\s`),
    new RegExp(`^${parent}\\.\\d+`),
  ];

  return patterns.some((pattern) => pattern.test(trimmed));
}

function compareCkeIdentifiers(left: string, right: string): number {
  const leftParent = Number.parseInt(getCkeParentNumber(left), 10);
  const rightParent = Number.parseInt(getCkeParentNumber(right), 10);

  if (leftParent !== rightParent) {
    return leftParent - rightParent;
  }

  const leftPart = getCkePartNumber(left);
  const rightPart = getCkePartNumber(right);

  if (leftPart && rightPart) {
    return Number.parseInt(leftPart, 10) - Number.parseInt(rightPart, 10);
  }

  if (leftPart) {
    return 1;
  }

  if (rightPart) {
    return -1;
  }

  return left.localeCompare(right, "pl");
}

function exerciseToSubtask(
  exercise: VisionExercise,
  label: string
): VisionSubtask | null {
  const bodyParagraphs = collectExerciseBodyParagraphs(exercise);

  if (bodyParagraphs.length === 0 && !(exercise.subtasks?.length ?? 0)) {
    return null;
  }

  if (exercise.subtasks?.length === 1 && bodyParagraphs.length === 0) {
    const only = exercise.subtasks[0];

    return {
      ...only,
      label: label || only.label,
    };
  }

  if (exercise.subtasks?.length) {
    return {
      label,
      text: [
        ...bodyParagraphs,
        ...(exercise.subtasks ?? [])
          .filter((subtask) => subtaskHasContent(subtask))
          .map(
            (subtask) =>
              `${subtask.label}) ${formatSubtaskPlainContent(subtask)}`
          ),
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    label,
    text: bodyParagraphs.join("\n"),
  };
}

function mergeMultipartGroup(
  group: Array<VisionExercise & VisionExerciseIdentifiers>
): VisionExercise & VisionExerciseIdentifiers {
  const sorted = [...group].sort((left, right) =>
    compareCkeIdentifiers(left.identifier, right.identifier)
  );
  const parent = getCkeParentNumber(sorted[0].identifier);
  const primary = sorted[0];
  const subtasks: VisionSubtask[] = [];

  for (const exercise of sorted) {
    const part = getCkePartNumber(exercise.identifier);
    const label = part ?? exercise.subtasks?.[0]?.label ?? "1";

    if ((exercise.subtasks?.length ?? 0) > 0 && !exercise.instruction?.trim()) {
      subtasks.push(...(exercise.subtasks ?? []));
      continue;
    }

    const converted = exerciseToSubtask(exercise, label);

    if (converted) {
      subtasks.push(converted);
    }
  }

  const sharedInstruction =
    sorted.find((exercise) => collectExerciseBodyParagraphs(exercise).length > 0)
      ?.instruction?.trim() ?? "";
  const sharedContext =
    sorted.find((exercise) => exercise.context?.trim())?.context?.trim() ?? "";
  const sharedQuestion =
    sorted.find((exercise) => exercise.question?.trim())?.question?.trim() ?? "";

  const hasOnlySubparts = sorted.every((exercise) =>
    Boolean(getCkePartNumber(exercise.identifier))
  );

  return {
    ...primary,
    identifier: parent,
    context: hasOnlySubparts ? sharedContext || primary.context : primary.context,
    instruction: hasOnlySubparts ? sharedInstruction : primary.instruction,
    question: hasOnlySubparts ? sharedQuestion || primary.question : primary.question,
    subtasks:
      subtasks.length > 0
        ? subtasks
        : primary.subtasks,
    choices: primary.choices,
    exerciseKind:
      sorted.find(
        (exercise) =>
          exercise.exerciseKind && exercise.exerciseKind !== "standard"
      )?.exerciseKind ??
      inferVisionExerciseKind({
        ...primary,
        subtasks:
          subtasks.length > 0 ? subtasks : primary.subtasks,
        instruction: hasOnlySubparts
          ? sharedInstruction
          : primary.instruction,
      }) ??
      primary.exerciseKind,
    answers: sorted.find((exercise) => (exercise.answers?.length ?? 0) > 0)
      ?.answers ?? primary.answers,
    correctChoice: primary.correctChoice,
    level: primary.level,
    sourceIdentifierBasic: null,
    sourceIdentifierExtended: null,
  };
}

function groupMultipartExercises(
  exercises: Array<VisionExercise & VisionExerciseIdentifiers>
): Array<VisionExercise & VisionExerciseIdentifiers> {
  const byParent = new Map<
    string,
    Array<VisionExercise & VisionExerciseIdentifiers>
  >();

  for (const exercise of exercises) {
    const parent = getCkeParentNumber(exercise.identifier);
    const list = byParent.get(parent) ?? [];
    list.push(exercise);
    byParent.set(parent, list);
  }

  const result: Array<VisionExercise & VisionExerciseIdentifiers> = [];

  for (const group of byParent.values()) {
    const hasMultipart = group.some((exercise) =>
      Boolean(getCkePartNumber(exercise.identifier))
    );

    if (group.length > 1 && hasMultipart) {
      result.push(mergeMultipartGroup(group));
      continue;
    }

    for (const exercise of group) {
      result.push({
        ...exercise,
        identifier: getCkeParentNumber(exercise.identifier),
      });
    }
  }

  return result.sort((left, right) =>
    compareCkeIdentifiers(left.identifier, right.identifier)
  );
}

export function looksLikeCkeVisionImport(exercises: VisionExercise[]): boolean {
  if (exercises.length === 0) {
    return false;
  }

  const ckeCount = exercises.filter((exercise) =>
    isCkeStyleIdentifier(exercise.identifier)
  ).length;

  return ckeCount >= Math.max(1, Math.ceil(exercises.length * 0.5));
}

/**
 * CKE/Matura post-processing: normalize numbering, merge 12.1/12.2 fragments,
 * and avoid Pazdro-style PP/PR merges.
 */
export function mergeCkeVisionExercises(
  exercises: VisionExercise[]
): Array<VisionExercise & VisionExerciseIdentifiers> {
  const normalized = exercises
    .map(normalizeVisionExercise)
    .map((exercise) => ({
      ...exercise,
      identifier: normalizeCkeIdentifier(exercise.identifier),
      sourceIdentifierBasic: null,
      sourceIdentifierExtended: null,
    }));

  return groupMultipartExercises(normalized);
}

export function mergeVisionExercisesForImport(
  exercises: VisionExercise[],
  options?: { preferCke?: boolean }
): Array<VisionExercise & VisionExerciseIdentifiers> {
  const useCke =
    options?.preferCke ?? looksLikeCkeVisionImport(exercises);

  if (useCke) {
    return mergeCkeVisionExercises(exercises);
  }

  return mergePazdroDualVisionExercises(exercises);
}
