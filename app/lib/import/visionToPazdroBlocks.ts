import type { ExerciseLevel } from "./types";
import type { PazdroExerciseBlock } from "./pazdroParser";
import type { VisionExercise } from "./visionExtract";
import { normalizeVisionExercise, formatSubtaskPlainContent, collectExerciseBodyParagraphs } from "./visionNormalize";
import {
  visionExerciseSuggestedTyp,
  visionExerciseToEditorDocuments,
} from "./visionToEditorDocument";
import {
  formatMultipleChoiceLabel,
  formatMultipleChoiceOptionsInline,
  isMultipleChoiceOptionLabel,
} from "./multipleChoiceDetect";
import {
  formatTrueFalseStatementsInline,
  visionTableLooksLikeTrueFalse,
  visionTableToStatements,
} from "./trueFalseDetect";
function normalizeLevel(
  level: VisionExercise["level"]
): { level: ExerciseLevel | null; levelDetected: boolean } {
  if (level === "basic" || level === "extended") {
    return { level, levelDetected: true };
  }

  return { level: null, levelDetected: false };
}

function formatSubtaskLabel(label: string): string {
  const trimmed = label.trim();

  if (/^[a-z]$/i.test(trimmed)) {
    return `${trimmed})`;
  }

  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)$/i.test(trimmed)) {
    return `${trimmed}.`;
  }

  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}.`;
  }

  return trimmed.endsWith(")") || trimmed.endsWith(".")
    ? trimmed
    : `${trimmed})`;
}

export function visionExerciseToText(exercise: VisionExercise): string {
  const lines: string[] = [];

  for (const paragraph of collectExerciseBodyParagraphs(exercise)) {
    lines.push(paragraph);
  }

  for (const subtask of exercise.subtasks ?? []) {
    const content = formatSubtaskPlainContent(subtask);

    if (!content) {
      continue;
    }

    lines.push(`${formatSubtaskLabel(subtask.label)} ${content}`);
  }

  const choiceOptions = (exercise.choices ?? [])
    .map((choice) => {
      const content = choice.text?.trim() || choice.expression?.trim() || "";

      if (!content || !isMultipleChoiceOptionLabel(choice.label)) {
        return null;
      }

      return { label: choice.label, text: content };
    })
    .filter(
      (option): option is { label: string; text: string } => option !== null
    );

  if (choiceOptions.length > 0) {
    lines.push(formatMultipleChoiceOptionsInline(choiceOptions));
  }

  const directStatements = (exercise.statements ?? [])
    .map((statement) => {
      const text = statement.text?.trim() || statement.expression?.trim() || "";

      if (!text) {
        return null;
      }

      return {
        label: statement.label?.trim() || undefined,
        text,
      };
    })
    .filter(
      (statement): statement is { label?: string; text: string } =>
        Boolean(statement)
    );

  if (directStatements.length > 0) {
    lines.push(formatTrueFalseStatementsInline(directStatements));
  } else {
    for (const table of exercise.tables ?? []) {
      if (!visionTableLooksLikeTrueFalse(table.headers, table.rows)) {
        continue;
      }

      const fromTable = visionTableToStatements(table.headers, table.rows);

      if (fromTable.length > 0) {
        lines.push(formatTrueFalseStatementsInline(fromTable));
        break;
      }
    }
  }

  return lines.join("\n").trim();
}

export function visionExercisesToPazdroBlocks(
  exercises: VisionExercise[]
): PazdroExerciseBlock[] {
  return exercises
    .map((exercise): PazdroExerciseBlock | null => {
      const normalized = normalizeVisionExercise(exercise);
      const number = normalized.identifier?.trim();

      if (!number) {
        return null;
      }

      const text = visionExerciseToText(normalized);

      if (!text) {
        return null;
      }

      const { level, levelDetected } = normalizeLevel(normalized.level);
      const documents = visionExerciseToEditorDocuments(
        normalized,
        `vision-${number}`
      );

      return {
        number,
        text,
        tresc: documents.tresc,
        odpowiedz: documents.odpowiedz,
        rozwiazanie: documents.rozwiazanie,
        confidence: levelDetected ? 0.94 : 0.88,
        level,
        levelDetected,
        identifikatorPp: normalized.sourceIdentifierBasic ?? null,
        identifikatorPr: normalized.sourceIdentifierExtended ?? null,
        suggestedTyp: visionExerciseSuggestedTyp(normalized),
      };
    })
    .filter((block): block is PazdroExerciseBlock => block !== null);
}
