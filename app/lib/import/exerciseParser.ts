import { createEmptyDocument } from "@/app/components/editor/core/document";
import { normalizeParsedExercisesPazdroIdentifiers } from "./pazdroIdentifier";
import type { ParsedExercise } from "./types";
import type { MathReconstructionMethod } from "./mathReconstruction";
import { reconstructExerciseMath } from "./mathReconstruction";
import {
  buildMultipleChoiceAnswerDocument,
  buildMultipleChoiceDocument,
  detectMultipleChoiceInText,
} from "./multipleChoiceDetect";
import { textToEditorDocument } from "./textToDocument";

export type RawExerciseBlock = {
  number: string | null;
  text: string;
  confidence: number;
  level?: import("./types").ExerciseLevel | null;
  levelDetected?: boolean;
  tresc?: import("@/app/components/editor/types").EditorDocument;
  odpowiedz?: import("@/app/components/editor/types").EditorDocument;
  rozwiazanie?: import("@/app/components/editor/types").EditorDocument;
  identifikatorPp?: string | null;
  identifikatorPr?: string | null;
  suggestedTyp?: string | null;
};

const EXERCISE_START_PATTERNS = [
  /^(?:Zadanie|Zad\.|Ćw\.|Ćwiczenie|Z)\s*(\d+[a-z]?)\s*[.:)\-–—]?\s*/i,
  /^(\d+\.\d{1,3}[a-z]?)\s*\.\s+(?:\d+\.\d+\.\s+)?(1\.\d{1,3}[a-z]?)\s*\./i,
  /^(\d+[a-z]?)\s*[.)]\s+/,
  /^(\d+[a-z]?)\s+[A-ZĄĆĘŁŃÓŚŹŻ]/,
  /^(1\.\d{1,3}[a-z]?)\s*\./i,
];

function detectExerciseNumber(line: string): string | null {
  const pazdroMatch = line.match(
    /^\d+\.\d+\.\s+(1\.\d{1,3}[a-z]?)\s*\./i
  );

  if (pazdroMatch?.[1]) {
    return pazdroMatch[1];
  }

  for (const pattern of EXERCISE_START_PATTERNS) {
    const match = line.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function stripExercisePrefix(line: string): string {
  for (const pattern of EXERCISE_START_PATTERNS) {
    if (pattern.test(line)) {
      return line.replace(pattern, "").trim();
    }
  }

  return line.trim();
}

/**
 * Rule-based exercise detection from OCR / PDF text.
 */
export function detectExercisesFromText(
  rawText: string
): RawExerciseBlock[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: RawExerciseBlock[] = [];
  let currentNumber: string | null = null;
  let currentLines: string[] = [];
  let foundExplicitMarker = false;

  function flush() {
    const text = currentLines.join("\n").trim();

    if (!text) {
      currentLines = [];
      return;
    }

    blocks.push({
      number: currentNumber,
      text,
      confidence: currentNumber ? 0.85 : 0.55,
    });
    currentLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentLines.length > 0) {
        currentLines.push("");
      }

      continue;
    }

    const number = detectExerciseNumber(trimmed);

    if (number) {
      flush();
      currentNumber = number;
      foundExplicitMarker = true;
      currentLines.push(stripExercisePrefix(trimmed));
      continue;
    }

    currentLines.push(trimmed);
  }

  flush();

  if (blocks.some((block) => block.number)) {
    return blocks.filter((block) => block.number);
  }

  if (!foundExplicitMarker && blocks.length <= 1) {
    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (paragraphs.length > 1) {
      return paragraphs.map((text, index) => ({
        number: String(index + 1),
        text,
        confidence: 0.6,
      }));
    }
  }

  return blocks;
}

function buildExerciseDocuments(
  block: RawExerciseBlock,
  contentText: string,
  index: number
): {
  tresc: import("@/app/components/editor/types").EditorDocument;
  odpowiedz: import("@/app/components/editor/types").EditorDocument;
  suggestedTyp: string | null;
} {
  if (block.tresc) {
    return {
      tresc: block.tresc,
      odpowiedz: block.odpowiedz ?? createEmptyDocument(`ans-${index}`),
      suggestedTyp: block.suggestedTyp ?? null,
    };
  }

  const multipleChoice = detectMultipleChoiceInText(contentText);

  if (multipleChoice) {
    return {
      tresc: buildMultipleChoiceDocument(
        multipleChoice.question,
        multipleChoice.options,
        `import-${index}`
      ),
      odpowiedz: buildMultipleChoiceAnswerDocument(
        multipleChoice.correctChoice,
        `ans-${index}`
      ),
      suggestedTyp: "wybor-wielokrotny",
    };
  }

  return {
    tresc: textToEditorDocument(contentText, `import-${index}`),
    odpowiedz: createEmptyDocument(`ans-${index}`),
    suggestedTyp: block.suggestedTyp ?? null,
  };
}

function blocksToParsedExercises(
  blocks: Array<
    RawExerciseBlock & {
      reconstructedText?: string;
      mathReconstructed?: boolean;
      mathReconstructionMethod?: MathReconstructionMethod | null;
    }
  >,
  options?: {
    level?: import("./types").ExerciseLevel | null;
    levelDetected?: boolean;
  }
): ParsedExercise[] {
  const exercises = blocks.map((block, index) => {
    const contentText = block.reconstructedText ?? block.text;
    const documents = buildExerciseDocuments(block, contentText, index);

    return {
      index,
      number: block.number,
      rawText: block.text,
      confidence: block.confidence,
      level: block.level ?? options?.level ?? null,
      levelDetected: block.levelDetected ?? options?.levelDetected ?? false,
      mathReconstructed: block.mathReconstructed ?? false,
      mathReconstructionMethod: block.mathReconstructionMethod ?? null,
      tresc: documents.tresc,
      rozwiazanie:
        block.rozwiazanie ?? createEmptyDocument(`sol-${index}`),
      odpowiedz: documents.odpowiedz,
      selected: true,
      saved: false,
      savedTaskId: null,
      savedKod: null,
      poziom: null,
      punkty: null,
      czas: null,
      identifikatorPp: block.identifikatorPp ?? null,
      identifikatorPr: block.identifikatorPr ?? null,
      suggestedTyp: documents.suggestedTyp,
    };
  });

  return normalizeParsedExercisesPazdroIdentifiers(exercises);
}

export function rawBlocksToExercises(
  blocks: RawExerciseBlock[],
  options?: {
    level?: import("./types").ExerciseLevel | null;
    levelDetected?: boolean;
  }
): ParsedExercise[] {
  return blocksToParsedExercises(blocks, options);
}

export async function rawBlocksToExercisesWithMathReconstruction(
  blocks: RawExerciseBlock[],
  options?: {
    level?: import("./types").ExerciseLevel | null;
    levelDetected?: boolean;
    preferAi?: boolean;
  }
): Promise<ParsedExercise[]> {
  const enriched = [];

  for (const block of blocks) {
    if (block.tresc) {
      enriched.push(block);
      continue;
    }

    const reconstruction = await reconstructExerciseMath(block.text, {
      preferAi: options?.preferAi,
    });

    enriched.push({
      ...block,
      reconstructedText: reconstruction.text,
      mathReconstructed: reconstruction.method !== "passthrough",
      mathReconstructionMethod: reconstruction.method,
      confidence:
        reconstruction.method === "passthrough"
          ? block.confidence
          : Math.min(0.95, block.confidence + 0.05),
    });
  }

  return blocksToParsedExercises(enriched, options);
}
