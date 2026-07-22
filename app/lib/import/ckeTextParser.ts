import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type { EditorDocument, InlineNode, Paragraph } from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

import {
  buildMultipleChoiceAnswerDocument,
  buildMultipleChoiceOptionsParagraph,
  detectMultipleChoiceInText,
  extractInlineMultipleChoiceOptions,
  type MultipleChoiceOption,
} from "./multipleChoiceDetect";
import {
  buildTrueFalseTableParagraph,
  detectTrueFalseInText,
} from "./trueFalseDetect";
import { normalizeCkeImportText } from "./ckeTextNormalize";
import type { RawExerciseBlock } from "./exerciseParser";
import { formatCkeNumberingPrefix, getCkePartNumber } from "./maturaParser";
import { mergeInlineBodySegments } from "./visionNormalize";
import { inlineContentToInlineNodes } from "./visionInlineMath";
import { visionValueToLatex } from "./visionNotationToLatex";
import { shouldRenderAsMath } from "./visionContentClassification";

const CKE_HEADER_PATTERN =
  /(?:^|\n)Zadanie\s+(\d{1,2})(?:\.(\d+))?\.\s*(?:\(([0-9–—\-]+)\))?\s*/gi;

const CKE_TEXT_MARKERS = [
  /Zadanie\s+\d{1,2}(?:\.\d+)?\./i,
  /egzamin\s+matur/i,
  /MMAP-P/i,
  /Dokończ\s+zdanie/i,
  /Wybierz\s+właściwą\s+odpowiedź/i,
];

const NOISE_LINE_PATTERNS = [
  /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /^Strona\s+\d+\s+z\s+\d+/i,
  /^MMAP-P/i,
  /^arkusze\.pl/i,
  /Wi[eę]cej\s+arkuszy/i,
  /^Wi$/i,
  /^ecej\s+arkuszy/i,
  /^ęcej\s+arkuszy/i,
  /^Brudnopis$/i,
  /^Układ\s+graficzny/i,
  /^WYPEŁNIA\s+/i,
  /^KOD\s+PESEL/i,
  /^Symbol\s+arkusza/i,
  /^MATEMATYKA$/i,
  /^Poziom\s+podstawowy/i,
  /^Formuła\s+20\d{2}$/i,
  /^Zadania\s+egzaminacyjne\s+są\s+wydrukowane/i,
  /^Instrukcja\s+dla\s+zdającego/i,
  /^BRUDNOPIS\s*\(nie\s+podlega/i,
  /^0–1–2$/i,
  /^0–1–\s*$/i,
  /^0–1$/i,
  /^\d+\.\s*0–1–2$/i,
];

type CkeSegment = {
  number: string;
  parentNumber: string;
  subpart: string | null;
  points: string | null;
  body: string;
};

function normalizeInput(text: string): string {
  return normalizeCkeImportText(text.replace(/\t/g, " "));
}

export function isCkeMaturaText(
  text: string,
  fileName?: string | null
): boolean {
  const sample = normalizeInput(text);
  const lowerName = fileName?.toLowerCase() ?? "";

  if (/matura|mmap-p|cke|egzamin/.test(lowerName)) {
    const headers = sample.match(/Zadanie\s+\d{1,2}(?:\.\d+)?\./gi) ?? [];
    return headers.length >= 2;
  }

  const markerHits = CKE_TEXT_MARKERS.filter((pattern) =>
    pattern.test(sample)
  ).length;
  const headers = sample.match(/Zadanie\s+\d{1,2}(?:\.\d+)?\./gi) ?? [];

  return markerHits >= 2 && headers.length >= 5;
}

function trimExerciseRegion(text: string): string {
  const normalized = normalizeInput(text);
  const startMatch = normalized.match(/Zadanie\s+1\./i);

  if (!startMatch?.index && startMatch?.index !== 0) {
    return normalized;
  }

  const start = startMatch.index;
  const tailMarkers = [
    /BRUDNOPIS\s*\(nie\s+podlega/i,
    /^\s*MATEMATYKA\s*$/m,
  ];

  let end = normalized.length;

  for (const pattern of tailMarkers) {
    const match = normalized.slice(start).search(pattern);

    if (match > 0) {
      end = Math.min(end, start + match);
    }
  }

  return normalized.slice(start, end).trim();
}

function cleanBodyLines(body: string): string {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitCkeSegments(text: string): CkeSegment[] {
  const region = trimExerciseRegion(text);
  const matches = [...region.matchAll(CKE_HEADER_PATTERN)];
  const segments: CkeSegment[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const base = match[1];
    const part = match[2] ?? null;
    const number = part ? `${base}.${part}` : base;
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd =
      index + 1 < matches.length
        ? matches[index + 1].index ?? region.length
        : region.length;
    const body = cleanBodyLines(region.slice(bodyStart, bodyEnd));

    if (!body) {
      continue;
    }

    segments.push({
      number,
      parentNumber: base,
      subpart: part,
      points: match[3] ?? null,
      body,
    });
  }

  return segments;
}

function detectSuggestedTyp(body: string): string | null {
  if (detectTrueFalseInText(body)) {
    return "prawda-falsz";
  }

  if (extractInlineMultipleChoiceOptions(body)?.length || detectMultipleChoiceInText(body)) {
    return "wybor-wielokrotny";
  }

  if (/\bP\s+F\b/i.test(body) || /\bwybierz\s+P,\s*jeśli/i.test(body)) {
    return "prawda-falsz";
  }

  return null;
}

function createSeededTextNode(text: string, seed: string, index: number) {
  return {
    id: `t-${seed}-${index}`,
    type: "text" as const,
    text,
  };
}

function createSeededMathNode(latex: string, seed: string, index: number) {
  return {
    id: `m-${seed}-${index}`,
    type: "math" as const,
    latex,
  };
}

function textToInlineNodes(
  text: string,
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  if (shouldRenderAsMath(trimmed)) {
    return [
      createSeededMathNode(
        visionValueToLatex(trimmed),
        seed,
        nodeCounter.value++
      ),
    ];
  }

  return inlineContentToInlineNodes(
    trimmed,
    [],
    (value) => createSeededTextNode(value, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );
}

function paragraphFromText(
  text: string,
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number },
  prefix = ""
): Paragraph {
  const nodes: InlineNode[] = [];

  if (prefix) {
    nodes.push(createSeededTextNode(prefix, seed, nodeCounter.value++));
  }

  nodes.push(...textToInlineNodes(text, seed, nodeCounter));

  return {
    id: `p-${seed}-${paragraphIndex}`,
    children: nodes.length > 0 ? nodes : [createSeededTextNode("", seed, 0)],
  };
}

function buildBodyParagraphs(
  body: string,
  seed: string,
  options?: MultipleChoiceOption[] | null
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const nodeCounter = { value: 0 };
  let paragraphIndex = 0;

  let questionText = body;
  let choices = options ?? null;
  const trueFalse = detectTrueFalseInText(body);

  if (trueFalse) {
    const blocks = trueFalse.question
      .split(/\n{2,}/)
      .flatMap((block) => block.split("\n"))
      .map((block) => block.trim())
      .filter(Boolean);

    for (const block of blocks) {
      paragraphs.push(
        paragraphFromText(block, seed, paragraphIndex++, nodeCounter)
      );
    }

    paragraphs.push(
      buildTrueFalseTableParagraph(
        trueFalse.statements,
        seed,
        paragraphIndex++
      )
    );

    return paragraphs;
  }

  if (!choices) {
    const detected = detectMultipleChoiceInText(body);

    if (detected) {
      questionText = detected.question;
      choices = detected.options;
    } else {
      const inline = extractInlineMultipleChoiceOptions(body);

      if (inline && inline.length >= 2) {
        const splitIndex = body.search(/\b[A-D]\.\s+/);

        if (splitIndex > 0) {
          questionText = body.slice(0, splitIndex).trim();
          choices = inline;
        }
      }
    }
  }

  const blocks = mergeInlineBodySegments(
    questionText
      .split(/\n{2,}/)
      .flatMap((block) => block.split("\n"))
      .map((block) => block.trim())
      .filter(Boolean)
  );

  for (const block of blocks) {
    paragraphs.push(
      paragraphFromText(block, seed, paragraphIndex++, nodeCounter)
    );
  }

  if (choices?.length) {
    paragraphs.push(
      buildMultipleChoiceOptionsParagraph(
        choices,
        seed,
        paragraphIndex++,
        nodeCounter
      )
    );
  }

  return paragraphs;
}

function buildCkeExerciseDocument(
  parentNumber: string,
  body: string,
  subparts: Array<{ label: string; body: string }>,
  seed: string
): EditorDocument {
  const paragraphs: Paragraph[] = [];
  const nodeCounter = { value: 0 };
  let paragraphIndex = 0;

  paragraphs.push({
    id: `p-${seed}-${paragraphIndex++}`,
    children: [
      createSeededTextNode(formatCkeNumberingPrefix(parentNumber), seed, 0),
    ],
  });

  if (subparts.length === 0) {
    paragraphs.push(...buildBodyParagraphs(body, seed));
  } else {
    if (body.trim()) {
      paragraphs.push(...buildBodyParagraphs(body, seed));
    }

    for (const subpart of subparts) {
      const subpartParagraphs = buildBodyParagraphs(subpart.body, seed);

      if (subpartParagraphs.length === 0) {
        paragraphs.push(
          paragraphFromText(
            "",
            seed,
            paragraphIndex++,
            nodeCounter,
            `${subpart.label}. `
          )
        );
        continue;
      }

      const [first, ...rest] = subpartParagraphs;

      paragraphs.push({
        ...first,
        id: `p-${seed}-${paragraphIndex++}`,
        children: [
          createSeededTextNode(`${subpart.label}. `, seed, nodeCounter.value++),
          ...first.children,
        ],
      });

      for (const paragraph of rest) {
        paragraphs.push({
          ...paragraph,
          id: `p-${seed}-${paragraphIndex++}`,
        });
      }
    }
  }

  if (paragraphs.length === 1) {
    paragraphs.push({
      id: `p-${seed}-empty`,
      children: [createSeededTextNode("", seed, 1)],
    });
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs,
  });
}

function mergeCkeSegments(segments: CkeSegment[]): Array<{
  parentNumber: string;
  sharedBody: string;
  subparts: Array<{ label: string; body: string }>;
  points: string | null;
  suggestedTyp: string | null;
}> {
  const byParent = new Map<string, CkeSegment[]>();

  for (const segment of segments) {
    const parent = segment.parentNumber;
    const list = byParent.get(parent) ?? [];
    list.push(segment);
    byParent.set(parent, list);
  }

  const merged: Array<{
    parentNumber: string;
    sharedBody: string;
    subparts: Array<{ label: string; body: string }>;
    points: string | null;
    suggestedTyp: string | null;
  }> = [];

  for (const [parentNumber, group] of byParent.entries()) {
    const sorted = [...group].sort((left, right) => {
      const leftPart = getCkePartNumber(left.number);
      const rightPart = getCkePartNumber(right.number);

      if (leftPart && rightPart) {
        return Number.parseInt(leftPart, 10) - Number.parseInt(rightPart, 10);
      }

      if (leftPart) {
        return 1;
      }

      if (rightPart) {
        return -1;
      }

      return 0;
    });

    const parentOnly = sorted.find((segment) => !segment.subpart);
    const subparts = sorted
      .filter((segment) => segment.subpart)
      .map((segment) => ({
        label: segment.subpart!,
        body: segment.body,
      }));

    const primaryBody = parentOnly?.body ?? "";
    const combinedText = [
      primaryBody,
      ...subparts.map((part) => `${part.label}. ${part.body}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    merged.push({
      parentNumber,
      sharedBody: primaryBody,
      subparts,
      points: parentOnly?.points ?? sorted[0]?.points ?? null,
      suggestedTyp: detectSuggestedTyp(combinedText),
    });
  }

  return merged.sort(
    (left, right) =>
      Number.parseInt(left.parentNumber, 10) -
      Number.parseInt(right.parentNumber, 10)
  );
}

export function parseCkeMaturaExercises(text: string): RawExerciseBlock[] {
  const segments = splitCkeSegments(text);

  if (segments.length === 0) {
    return [];
  }

  return mergeCkeSegments(segments).map((exercise, index) => {
    const seed = `cke-${exercise.parentNumber}`;
    const combinedBody = [
      exercise.sharedBody,
      ...exercise.subparts.map((part) => `${part.label}. ${part.body}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    const tresc = buildCkeExerciseDocument(
      exercise.parentNumber,
      exercise.sharedBody,
      exercise.subparts,
      seed
    );

    return {
      number: exercise.parentNumber,
      text: `${formatCkeNumberingPrefix(exercise.parentNumber)}\n\n${combinedBody}`,
      confidence: 0.96,
      tresc,
      odpowiedz: createEmptyDocument(`${seed}-ans`),
      rozwiazanie: createEmptyDocument(`${seed}-sol`),
      suggestedTyp: exercise.suggestedTyp,
      identifikatorPp: null,
      identifikatorPr: null,
    };
  });
}

export function parseCkeMaturaExercisesFromFile(
  text: string,
  fileName?: string | null
): RawExerciseBlock[] {
  if (!isCkeMaturaText(text, fileName)) {
    return [];
  }

  return parseCkeMaturaExercises(text);
}
