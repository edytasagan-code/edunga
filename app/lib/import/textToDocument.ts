import {
  createEmptyDocument,
  createMathNode,
  createTextNode,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type { EditorDocument, InlineNode } from "@/app/components/editor/types";

const MATH_PATTERNS: Array<{
  regex: RegExp;
  mode: "inline" | "block";
}> = [
  { regex: /\$\$([\s\S]+?)\$\$/g, mode: "block" },
  { regex: /\\\[([\s\S]+?)\\\]/g, mode: "block" },
  { regex: /\$([^$\n]+?)\$/g, mode: "inline" },
  { regex: /\\\(([\s\S]+?)\\\)/g, mode: "inline" },
];

type Segment =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string };

function splitMathSegments(input: string): Segment[] {
  const matches: Array<{
    start: number;
    end: number;
    latex: string;
  }> = [];

  for (const pattern of MATH_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match = pattern.regex.exec(input);

    while (match) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        latex: match[1].trim(),
      });
      match = pattern.regex.exec(input);
    }
  }

  if (matches.length === 0) {
    return input ? [{ kind: "text", value: input }] : [];
  }

  matches.sort((left, right) => left.start - right.start);

  const deduped: typeof matches = [];

  for (const item of matches) {
    const overlaps = deduped.some(
      (existing) =>
        item.start < existing.end && item.end > existing.start
    );

    if (!overlaps) {
      deduped.push(item);
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;

  for (const item of deduped) {
    if (item.start > cursor) {
      segments.push({
        kind: "text",
        value: input.slice(cursor, item.start),
      });
    }

    segments.push({
      kind: "math",
      value: item.latex,
    });
    cursor = item.end;
  }

  if (cursor < input.length) {
    segments.push({
      kind: "text",
      value: input.slice(cursor),
    });
  }

  return segments;
}

function segmentsToInlineNodes(segments: Segment[]): InlineNode[] {
  const nodes: InlineNode[] = [];

  for (const segment of segments) {
    if (segment.kind === "text") {
      if (segment.value) {
        nodes.push(createTextNode(segment.value));
      }

      continue;
    }

    if (segment.value) {
      nodes.push(createMathNode(segment.value));
    }
  }

  if (nodes.length === 0) {
    nodes.push(createTextNode(""));
  }

  return nodes;
}

function normalizePlainText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Converts mixed plain text / LaTeX into an EditorDocument.
 */
export function textToEditorDocument(
  input: string,
  seed?: string
): EditorDocument {
  const normalized = normalizePlainText(input);

  if (!normalized) {
    return createEmptyDocument(seed);
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const document: EditorDocument = {
    version: 1,
    paragraphs: paragraphs.map((block, index) => ({
      id: seed ? `p-${seed}-${index}` : crypto.randomUUID(),
      children: segmentsToInlineNodes(splitMathSegments(block)),
    })),
  };

  return ensureDocumentInlineEditing(document);
}

export function editorDocumentToPlainPreview(
  document: EditorDocument
): string {
  return document.paragraphs
    .map((paragraph) =>
      paragraph.children
        .map((node) => {
          if (node.type === "text") {
            return node.text;
          }

          if (node.type === "math") {
            return `$${node.latex}$`;
          }

          return "";
        })
        .join("")
    )
    .join("\n\n");
}
