import type { ExerciseLevel } from "./types";
import type { EditorDocument } from "@/app/components/editor/types";
import {
  detectLevelFromImageRegion,
  findExerciseNumberWord,
  normalizeExerciseNumberToken,
  type OcrPageResult,
} from "./levelDetect";

export type PazdroExerciseBlock = {
  number: string;
  text: string;
  confidence: number;
  level: ExerciseLevel | null;
  levelDetected: boolean;
  tresc?: EditorDocument;
  odpowiedz?: EditorDocument;
  rozwiazanie?: EditorDocument;
  identifikatorPp?: string | null;
  identifikatorPr?: string | null;
  suggestedTyp?: string | null;
};

const PAZDRO_HEADER_PATTERN =
  /(?:^|\n)(\d+\.\d+)\.\s+(1\.\d{1,3}[a-z]?)\.\s*/gi;

const PAZDRO_INLINE_PATTERN = /(\d+\.\d+)\.\s+(1\.\d{1,3}[a-z]?)\./g;

function stripTrailingAnswers(text: string): string {
  return text
    .replace(/\nOdp\.\s*[\s\S]*$/i, "")
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--\s*$/i, "")
    .trim();
}

function collectHeaders(rawText: string): Array<{ index: number; number: string }> {
  const headers: Array<{ index: number; number: string }> = [];

  for (const match of rawText.matchAll(PAZDRO_HEADER_PATTERN)) {
    const number = normalizeExerciseNumberToken(match[2] ?? "");

    if (!number) {
      continue;
    }

    headers.push({
      index: match.index ?? 0,
      number,
    });
  }

  return headers;
}

async function detectLevelForNumber(
  pages: OcrPageResult[],
  exerciseNumber: string
): Promise<ExerciseLevel | null> {
  for (const page of pages) {
    const word = findExerciseNumberWord(page.words, exerciseNumber);

    if (!word) {
      continue;
    }

    const level = await detectLevelFromImageRegion(page.image, word.bbox);

    if (level) {
      return level;
    }
  }

  return null;
}

export async function detectPazdroExercises(
  rawText: string,
  pages: OcrPageResult[] = []
): Promise<PazdroExerciseBlock[]> {
  const headers = collectHeaders(rawText);

  if (headers.length === 0) {
    return [];
  }

  const blocks: PazdroExerciseBlock[] = [];

  for (let index = 0; index < headers.length; index += 1) {
    const current = headers[index];
    const next = headers[index + 1];
    const start = current.index;
    const end = next?.index ?? rawText.length;
    const slice = rawText.slice(start, end);
    const body = slice
      .replace(PAZDRO_INLINE_PATTERN, "")
      .replace(/^\d+\.\d+\.\s+1\.\d{1,3}[a-z]?\.?\s*/, "")
      .trim();
    const text = stripTrailingAnswers(body);
    const level = pages.length
      ? await detectLevelForNumber(pages, current.number)
      : null;

    blocks.push({
      number: current.number,
      text,
      confidence: level ? 0.9 : 0.82,
      level,
      levelDetected: level !== null,
    });
  }

  return blocks;
}

export function isPazdroTextbookText(rawText: string): boolean {
  return /(\d+\.\d+)\.\s+(1\.\d{1,3}[a-z]?)\./i.test(rawText);
}
