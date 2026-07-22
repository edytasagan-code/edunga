import type { InlineNode } from "@/app/components/editor/types";

import {
  MathParseError,
  parseMathNotation,
  preprocessComplexFractionNotation,
} from "./mathNotation/parse";
import { mathAstToLatex } from "./mathNotation/latex";
import {
  containsLatexEnvironment,
  findMeasurementTextRanges,
  looksLikeDisplayEquation,
  shouldRenderAsMath,
  spanOverlapsRange,
} from "./visionContentClassification";
import { visionExpressionToLatex } from "./visionNotationToLatex";
import {
  FILL_DOT_PATTERN,
  intervalFillPlaceholderLatex,
  numberFillPlaceholderLatex,
} from "./fillBlankDetect";

type MathSpan = {
  start: number;
  end: number;
};

type InlineSegment = { kind: "text" | "math"; value: string };

const LATEX_DELIMITER_PATTERNS = [
  /\$\$([\s\S]+?)\$\$/g,
  /\\\[([\s\S]+?)\\\]/g,
  /\$([^$\n]+?)\$/g,
  /\\\(([\s\S]+?)\\\)/g,
];

const RAW_LATEX_SPAN_PATTERNS = [
  /\\frac\{[^{}]*\}\{[^{}]*\}/g,
  /\\sqrt\{[^{}]*\}/g,
  /\\(?:left|right)(?:\(|\)|\[|\]|\||\{|\}|\.)/g,
  /\\(?:cdot|div|times|pm|mp|leq|geq|neq|approx|infty|pi|alpha|beta|gamma|delta|theta|lambda|mu|sigma|phi|omega)\b/g,
  /(?:\d+|[a-zA-Z])\^\{[^{}]*\}/g,
  /(?:\d+|[a-zA-Z])_\{[^{}]*\}/g,
  /\\[a-zA-Z]+\{[^{}]*\}/g,
];

const UNICODE_GREEK_LETTER_PATTERN =
  /(?<=^|[\s(,])[\u03B1\u03B2\u03B3\u03B4\u03B8\u03BB\u03BC\u03C3\u03C6\u03C9](?=[\s),.;]|$)/gu;

const LATEX_ENVIRONMENT_PATTERN =
  /\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g;

function normalizeInlineSource(source: string): string {
  return source
    .replace(/\u2212/g, "-")
    .replace(/-\s+√/g, "-√")
    .replace(/\+\s+√/g, "+√")
    .replace(/\b([a-zA-Z])·x\b/g, "$1(x)");
}

/**
 * CKE fill-in-the-blank dots (………) become editable MathLive placeholders.
 * Interval gaps use bracket notation; numeric gaps use a single slot.
 */
function fillPlaceholderSpanToLatex(
  text: string,
  start: number,
  end: number
): string {
  const segment = text.slice(start, end);

  if (!FILL_DOT_PATTERN.test(segment)) {
    return segment;
  }

  const before = text.slice(Math.max(0, start - 50), start).toLowerCase();

  if (/\bprzedział\s*$/.test(before)) {
    return intervalFillPlaceholderLatex();
  }

  return numberFillPlaceholderLatex();
}

function findFillPlaceholderSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /[.\u2026…]{3,}/g;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? -1;

    if (index < 0) {
      continue;
    }

    spans.push({
      start: index,
      end: index + match[0].length,
    });
  }

  return spans;
}

export function tryParseMathToLatex(source: string): string | null {
  const normalized = preprocessComplexFractionNotation(
    normalizeInlineSource(source.trim())
  );

  if (!normalized) {
    return null;
  }

  try {
    parseMathNotation(normalized);
    return visionExpressionToLatex(normalized);
  } catch (error) {
    if (!(error instanceof MathParseError)) {
      return null;
    }

    return null;
  }
}

export function passthroughLatexIfRecognized(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (
    /^\\(?:frac|sqrt|left|right|cdot|div|times|pm|mp|leq|geq|neq|approx|infty|pi|alpha|beta|gamma|delta|theta|lambda|mu|sigma|phi|omega)\b/.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  if (/^(?:\d+|[a-zA-Z])\^\{[^{}]+\}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^(?:\d+|[a-zA-Z])_\{[^{}]+\}$/.test(trimmed)) {
    return trimmed;
  }

  if (
    /\\(?:frac|sqrt)\{/.test(trimmed) &&
    /^\\/.test(trimmed) &&
    !/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)
  ) {
    return trimmed;
  }

  if (containsLatexEnvironment(trimmed)) {
    return trimmed;
  }

  if (
    /^\\placeholder\{\}$/.test(trimmed) ||
    /^\\left\\[\\placeholder\{\}, \\placeholder\{\}\\right\\]$/.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
}

function normalizeDisplayEquationLatex(value: string): string {
  return value.trim().replace(/([A-Za-z])\^(\d+)/g, "$1^{$2}");
}

export function mathFragmentToLatex(source: string): string | null {
  const trimmed = source.trim();

  if (!trimmed) {
    return null;
  }

  const passthrough = passthroughLatexIfRecognized(trimmed);

  if (passthrough) {
    return passthrough;
  }

  if (looksLikeDisplayEquation(trimmed)) {
    return normalizeDisplayEquationLatex(trimmed);
  }

  if (!shouldRenderAsMath(trimmed)) {
    return null;
  }

  return tryParseMathToLatex(trimmed);
}

export function labeledAssignmentToLatex(source: string): string | null {
  const normalized = normalizeInlineSource(source.trim());
  const match = normalized.match(/^([A-Za-z])\s*=\s*(.+)$/);

  if (!match) {
    return null;
  }

  const [, label, rhs] = match;
  const rhsLatex = tryParseMathToLatex(rhs);

  if (!rhsLatex) {
    return null;
  }

  return `${label} = ${rhsLatex}`;
}

function inlineMathSegmentToLatex(segment: string): string | null {
  const trimmed = segment.trim();

  return (
    passthroughLatexIfRecognized(trimmed) ??
    labeledAssignmentToLatex(trimmed) ??
    (/^[A-Za-z]\s*[∪∩]\s*[A-Za-z]$/.test(trimmed)
      ? namedSetUnionToLatex(trimmed)
      : null) ??
    mathFragmentToLatex(trimmed)
  );
}

function splitLatexDelimitedContent(text: string): InlineSegment[] {
  const matches: Array<{ start: number; end: number; latex: string }> = [];

  for (const pattern of LATEX_DELIMITER_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);

    while (match) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        latex: match[1].trim(),
      });
      match = pattern.exec(text);
    }
  }

  if (matches.length === 0) {
    return text ? [{ kind: "text", value: text }] : [];
  }

  matches.sort((left, right) => left.start - right.start);

  const deduped: typeof matches = [];

  for (const item of matches) {
    const overlaps = deduped.some(
      (existing) => item.start < existing.end && item.end > existing.start
    );

    if (!overlaps) {
      deduped.push(item);
    }
  }

  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const item of deduped) {
    if (item.start > cursor) {
      segments.push({
        kind: "text",
        value: text.slice(cursor, item.start),
      });
    }

    segments.push({
      kind: "math",
      value: item.latex,
    });
    cursor = item.end;
  }

  if (cursor < text.length) {
    segments.push({
      kind: "text",
      value: text.slice(cursor),
    });
  }

  return segments;
}

function isLatexBraceArgument(text: string, braceIndex: number): boolean {
  const before = text.slice(0, braceIndex).trimEnd();

  return (
    /\\(?:frac|sqrt|text|left|right|overline|underline|mathbf|mathrm|cdot|div|times|begin|end)$/.test(
      before
    ) || /[\^_]$/.test(before)
  );
}

function expandEnvironmentSpanStart(text: string, environmentStart: number): number {
  const before = text.slice(0, environmentStart);
  const labelMatch = before.match(/[A-Za-z](?:\([^)]*\))?\s*=\s*$/);

  if (!labelMatch) {
    return environmentStart;
  }

  return environmentStart - labelMatch[0].length;
}

function findLatexEnvironmentSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];

  for (const match of text.matchAll(LATEX_ENVIRONMENT_PATTERN)) {
    const index = match.index ?? -1;

    if (index < 0) {
      continue;
    }

    spans.push({
      start: expandEnvironmentSpanStart(text, index),
      end: index + match[0].length,
    });
  }

  return spans;
}

function findUnicodeGreekLetterSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];

  for (const match of text.matchAll(UNICODE_GREEK_LETTER_PATTERN)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || !inlineMathSegmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function findRawLatexCommandSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];

  for (const pattern of RAW_LATEX_SPAN_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const candidate = match[0];
      const index = match.index ?? -1;

      if (index < 0 || !passthroughLatexIfRecognized(candidate)) {
        continue;
      }

      spans.push({
        start: index,
        end: index + candidate.length,
      });
    }
  }

  return spans;
}

function mergeSpans(spans: MathSpan[]): MathSpan[] {
  const deduped = spans.filter(
    (span, _, all) =>
      !all.some(
        (other) =>
          other !== span &&
          other.start <= span.start &&
          other.end >= span.end &&
          (other.start < span.start || other.end > span.end)
      )
  );

  const unique: MathSpan[] = [];
  const seen = new Set<string>();

  for (const span of deduped.sort((left, right) => left.start - right.start)) {
    const key = `${span.start}:${span.end}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(span);
  }

  return unique;
}

function excludeMeasurementOverlaps(text: string, spans: MathSpan[]): MathSpan[] {
  const protectedRanges = findMeasurementTextRanges(text);

  if (protectedRanges.length === 0) {
    return spans;
  }

  return spans.filter(
    (span) =>
      !protectedRanges.some((range) => spanOverlapsRange(span, range)) &&
      !protectedRanges.some(
        (range) =>
          span.end <= range.end &&
          span.start >= range.start &&
          /^\d+(?:,\d+)?$/.test(text.slice(span.start, span.end).trim())
      )
  );
}

function findLabeledAssignmentSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /[A-Za-z]\s*=\s*(?:\([^)]+\)|\{[^}]+\})/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || !labeledAssignmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function findIntervalSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /[(\[][^()[\]]+,[^()[\]]+[)\]]/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || !inlineMathSegmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function findSetNotationSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /\([^()]+\)(?:\s*[∪∩]\s*\([^()]+\))+/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || !inlineMathSegmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function findSetLiteralSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /\{[^}]+\}/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || isLatexBraceArgument(text, index)) {
      continue;
    }

    if (!inlineMathSegmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function findNamedSetUnionSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern = /\b[A-Za-z]\s*[∪∩]\s*[A-Za-z]\b/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function namedSetUnionToLatex(value: string): string {
  return value
    .replace(/\s*[∪]\s*/g, " \\cup ")
    .replace(/\s*[∩]\s*/g, " \\cap ")
    .trim();
}

function findMathElementSpans(text: string, mathElements: string[]): MathSpan[] {
  const spans: MathSpan[] = [];
  const used = new Set<number>();

  for (const element of mathElements.map((item) => item.trim()).filter(Boolean)) {
    let cursor = 0;

    while (cursor < text.length) {
      const index = text.indexOf(element, cursor);

      if (index < 0) {
        break;
      }

      if (!used.has(index) && inlineMathSegmentToLatex(element)) {
        spans.push({
          start: index,
          end: index + element.length,
        });
        used.add(index);
      }

      cursor = index + element.length;
    }
  }

  return spans;
}

function findEquationValueSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const labelPattern = /([a-z])\s*=\s*/gi;

  for (const match of text.matchAll(labelPattern)) {
    const valueStart = (match.index ?? 0) + match[0].length;
    let valueEnd = text.length;
    const orazIndex = text.indexOf(" oraz ", valueStart);

    if (orazIndex >= 0) {
      valueEnd = orazIndex;
    }

    const raw = text.slice(valueStart, valueEnd);
    const leading = raw.length - raw.trimStart().length;
    const value = raw.trim();

    if (!value || !inlineMathSegmentToLatex(value)) {
      continue;
    }

    const start = valueStart + leading;
    spans.push({
      start,
      end: start + value.length,
    });
  }

  return spans;
}

function findEmbeddedMathFragmentSpans(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  const pattern =
    /(?:[A-Za-z]\s*=\s*(?:\([^)]+\)|\{[^}]+\}))|(?:-?\d+\s+\d+\/\d+)|(?:-?(?:\d+(?:[.,]\d+)?(?:\(\d+\))?|π|√\d+|\([^)]+\))\s*\/\s*(?:\d+|π|√\d+|\([^)]+\)))|(?:-?√\d+)|(?:-?π\s*\/\s*\d+)|(?:[(\[][^()[\]]+,[^()[\]]+[)\]])|(?:\{[^{}]+\})|(?:\b[A-Za-z]\s*[∪∩]\s*[A-Za-z]\b)|(?:\d+\/\d+)/g;

  for (const match of text.matchAll(pattern)) {
    const candidate = match[0];
    const index = match.index ?? -1;

    if (index < 0 || !inlineMathSegmentToLatex(candidate)) {
      continue;
    }

    spans.push({
      start: index,
      end: index + candidate.length,
    });
  }

  return spans;
}

function collectMathSpans(text: string, mathElements: string[]): MathSpan[] {
  return excludeMeasurementOverlaps(
    text,
    mergeSpans([
      ...findLatexEnvironmentSpans(text),
      ...findRawLatexCommandSpans(text),
      ...findUnicodeGreekLetterSpans(text),
      ...findLabeledAssignmentSpans(text),
      ...findSetNotationSpans(text),
      ...findIntervalSpans(text),
      ...findSetLiteralSpans(text),
      ...findEmbeddedMathFragmentSpans(text),
      ...findNamedSetUnionSpans(text),
      ...findEquationValueSpans(text),
      ...findMathElementSpans(text, mathElements),
      ...findFillPlaceholderSpans(text),
    ])
  );
}

function splitVisionInlineMathContent(
  text: string,
  mathElements: string[] = []
): InlineSegment[] {
  const normalized = normalizeInlineSource(text);
  const labeled = labeledAssignmentToLatex(normalized);

  if (labeled) {
    return [{ kind: "math", value: normalized }];
  }

  if (mathFragmentToLatex(normalized)) {
    return [{ kind: "math", value: normalized }];
  }

  const spans = collectMathSpans(normalized, mathElements);

  if (spans.length === 0) {
    return [{ kind: "text", value: normalized }];
  }

  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({
        kind: "text",
        value: normalized.slice(cursor, span.start),
      });
    }

    segments.push({
      kind: "math",
      value: FILL_DOT_PATTERN.test(normalized.slice(span.start, span.end))
        ? fillPlaceholderSpanToLatex(normalized, span.start, span.end)
        : normalized.slice(span.start, span.end),
    });
    cursor = span.end;
  }

  if (cursor < normalized.length) {
    segments.push({
      kind: "text",
      value: normalized.slice(cursor),
    });
  }

  return segments.filter((segment) => segment.value.length > 0);
}

export function splitInlineMathContent(
  text: string,
  mathElements: string[] = []
): InlineSegment[] {
  const normalized = normalizeInlineSource(text);
  const delimited = splitLatexDelimitedContent(normalized);

  if (delimited.length === 1 && delimited[0]?.kind === "text") {
    return splitVisionInlineMathContent(delimited[0].value, mathElements);
  }

  const segments: InlineSegment[] = [];

  for (const part of delimited) {
    if (part.kind === "math") {
      segments.push(part);
      continue;
    }

    segments.push(...splitVisionInlineMathContent(part.value, mathElements));
  }

  return segments.filter((segment) => segment.value.length > 0);
}

export function inlineContentToInlineNodes(
  content: string,
  mathElements: string[] | undefined,
  createTextNode: (text: string) => InlineNode,
  createMathNode: (latex: string) => InlineNode
): InlineNode[] {
  const segments = splitInlineMathContent(content, mathElements ?? []);
  const nodes: InlineNode[] = [];

  for (const segment of segments) {
    if (segment.kind === "text") {
      nodes.push(createTextNode(segment.value));
      continue;
    }

    const latex = inlineMathSegmentToLatex(segment.value);

    if (latex) {
      nodes.push(createMathNode(latex));
    } else {
      nodes.push(createTextNode(segment.value));
    }
  }

  return nodes;
}
