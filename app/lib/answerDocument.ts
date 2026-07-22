import {
  createMathNode,
  createTextNode,
  ensureDocumentInlineEditing,
  ensureParagraphInlineEditing,
} from "@/app/components/editor/core/document";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
} from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createStableId(prefix: string, seed: string): string {
  return `${prefix}-${seed}`;
}

/**
 * Empty document with one inline math field (default for Treść / Odpowiedź).
 */
export function createEmptyAnswerDocument(
  seed?: string
): EditorDocument {
  const paragraphId = seed ? createStableId("p", seed) : createId();
  const mathId = seed ? createStableId("m", seed) : createId();
  const textBeforeId = seed
    ? createStableId("tb", seed)
    : createId();
  const textAfterId = seed ? createStableId("ta", seed) : createId();

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs: [
      ensureParagraphInlineEditing({
        id: paragraphId,
        children: [
          { id: textBeforeId, type: "text", text: "" },
          { id: mathId, type: "math", latex: "" },
          { id: textAfterId, type: "text", text: "" },
        ],
      }),
    ],
  });
}

function isParagraphEmptyTextOnly(paragraph: Paragraph | undefined): boolean {
  if (!paragraph) {
    return true;
  }

  return paragraph.children.every((node) => {
    if (node.type === "text") {
      return node.text.trim().length === 0;
    }

    return false;
  });
}

/**
 * Legacy empty text-only documents become math-first.
 */
export function normalizeAnswerDocument(
  document: EditorDocument,
  seed?: string
): EditorDocument {
  if (
    document.paragraphs.length === 1 &&
    isParagraphEmptyTextOnly(document.paragraphs[0])
  ) {
    return createEmptyAnswerDocument(seed);
  }

  return ensureDocumentInlineEditing(document);
}

export function isAnswerInMathMode(document: EditorDocument): boolean {
  return document.paragraphs[0]?.children.some(
    (node) => node.type === "math"
  ) ?? false;
}

export function getAnswerPrimaryMathId(
  document: EditorDocument
): string | null {
  const mathNode = document.paragraphs[0]?.children.find(
    (node) => node.type === "math"
  );

  return mathNode?.id ?? null;
}

function collectPlainText(document: EditorDocument): string {
  const paragraph = document.paragraphs[0];

  if (!paragraph) {
    return "";
  }

  return paragraph.children
    .map((node) => {
      if (node.type === "text") {
        return node.text;
      }

      if (node.type === "math") {
        return node.latex;
      }

      return "";
    })
    .join("");
}

export function convertAnswerToTextMode(
  document: EditorDocument
): EditorDocument {
  const paragraph = document.paragraphs[0];
  const text = collectPlainText(document);

  return ensureDocumentInlineEditing({
    ...document,
    paragraphs: [
      {
        id: paragraph?.id ?? createId(),
        children: [createTextNode(text)],
      },
    ],
  });
}

export function convertAnswerToMathMode(
  document: EditorDocument,
  seed?: string
): EditorDocument {
  const paragraph = document.paragraphs[0];
  const text = collectPlainText(document);
  const paragraphId = paragraph?.id ?? createId();
  const mathId = seed ? createStableId("m", seed) : createId();
  const textBeforeId = seed
    ? createStableId("tb", seed)
    : createId();
  const textAfterId = seed ? createStableId("ta", seed) : createId();

  return ensureDocumentInlineEditing({
    ...document,
    paragraphs: [
      ensureParagraphInlineEditing({
        id: paragraphId,
        children: [
          { id: textBeforeId, type: "text", text: "" },
          { id: mathId, type: "math", latex: text },
          { id: textAfterId, type: "text", text: "" },
        ],
      }),
    ],
  });
}

function cloneInlineNode(node: InlineNode): InlineNode {
  if (node.type === "text") {
    return createTextNode(node.text);
  }

  if (node.type === "math") {
    return createMathNode(node.latex);
  }

  return {
    ...node,
    id: createId(),
  };
}

function paragraphContentFingerprint(
  paragraph: Paragraph | undefined
): string {
  if (!paragraph) {
    return "";
  }

  return JSON.stringify(
    paragraph.children.map((node) => {
      if (node.type === "text") {
        return { type: "text", text: node.text };
      }

      if (node.type === "math") {
        return { type: "math", latex: node.latex };
      }

      if (node.type === "ink") {
        return { type: "ink", strokes: node.strokes };
      }

      if (node.type === "image") {
        return {
          type: "image",
          src: node.src,
          width: node.width,
          height: node.height,
        };
      }

      return { type: node.type };
    })
  );
}

export function buildSyncedSolutionFirstParagraph(
  answer: EditorDocument,
  existingParagraphId?: string
): Paragraph {
  const answerParagraph = answer.paragraphs[0];
  const children =
    answerParagraph && answerParagraph.children.length > 0
      ? answerParagraph.children.map(cloneInlineNode)
      : [createTextNode("")];

  return ensureParagraphInlineEditing({
    id: existingParagraphId ?? createId(),
    children,
  });
}

export function syncAnswerToSolution(
  answer: EditorDocument,
  solution: EditorDocument
): EditorDocument {
  const firstParagraphId = solution.paragraphs[0]?.id;
  const syncedFirst = buildSyncedSolutionFirstParagraph(
    answer,
    firstParagraphId
  );
  const paragraphs =
    solution.paragraphs.length > 0
      ? [syncedFirst, ...solution.paragraphs.slice(1)]
      : [syncedFirst];

  return ensureDocumentInlineEditing({
    ...solution,
    paragraphs,
  });
}

export function shouldLockSolutionFirstLine(
  answer: EditorDocument,
  solution: EditorDocument
): boolean {
  const expected = buildSyncedSolutionFirstParagraph(
    answer,
    solution.paragraphs[0]?.id
  );
  const actual = solution.paragraphs[0];

  return (
    paragraphContentFingerprint(expected) !==
    paragraphContentFingerprint(actual)
  );
}
