import type { VisionExercise } from "./visionExtract";
import {
  collectExerciseBodyParagraphs,
  formatSubtaskPlainContent,
  resolveSubtaskText,
  subtaskHasContent,
} from "./visionNormalize";
import { isMatchingExercise } from "./matchingDetect";
import { isMultipleChoiceOptionLabel } from "./multipleChoiceDetect";

export const FILL_DOT_PATTERN = /[.\u2026…]{3,}/;

const FILL_INSTRUCTION_PATTERN = /^Uzupełnij\b/i;

export function textHasFillDotPlaceholder(text: string): boolean {
  return FILL_DOT_PATTERN.test(text);
}

export function isFillBlankIndicator(text: string): boolean {
  return FILL_INSTRUCTION_PATTERN.test(text.trim());
}

function exerciseHasFillDotSubtasks(exercise: VisionExercise): boolean {
  return (exercise.subtasks ?? []).some((subtask) => {
    if (!subtaskHasContent(subtask)) {
      return false;
    }

    const text =
      resolveSubtaskText(subtask) ||
      subtask.text?.trim() ||
      subtask.expression?.trim() ||
      formatSubtaskPlainContent(subtask);

    return textHasFillDotPlaceholder(text);
  });
}

function exerciseHasFillInstruction(exercise: VisionExercise): boolean {
  if (isFillBlankIndicator(exercise.instruction ?? "")) {
    return true;
  }

  for (const paragraph of collectExerciseBodyParagraphs(exercise)) {
    if (isFillBlankIndicator(paragraph)) {
      return true;
    }
  }

  for (const block of exercise.bodyBlocks ?? []) {
    if (isFillBlankIndicator(block)) {
      return true;
    }
  }

  return false;
}

export function isFillBlankExercise(exercise: VisionExercise): boolean {
  if (exercise.exerciseKind === "fill_blank") {
    return true;
  }

  if (
    exercise.exerciseKind === "multiple_choice" ||
    exercise.exerciseKind === "true_false" ||
    exercise.exerciseKind === "matching"
  ) {
    return false;
  }

  const choices = exercise.choices ?? [];

  if (
    choices.length >= 2 &&
    choices.every((choice) => isMultipleChoiceOptionLabel(choice.label))
  ) {
    return false;
  }

  if (isMatchingExercise(exercise)) {
    return false;
  }

  return exerciseHasFillInstruction(exercise) && exerciseHasFillDotSubtasks(exercise);
}

export function inferVisionExerciseKind(
  exercise: VisionExercise
): VisionExercise["exerciseKind"] {
  if (exercise.exerciseKind) {
    return exercise.exerciseKind;
  }

  if (isFillBlankExercise(exercise)) {
    return "fill_blank";
  }

  return undefined;
}

export function intervalFillPlaceholderLatex(): string {
  return "\\left[\\placeholder{}, \\placeholder{}\\right]";
}

export function numberFillPlaceholderLatex(): string {
  return "\\placeholder{}";
}
