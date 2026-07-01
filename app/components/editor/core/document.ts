import {
  DOCUMENT_VERSION,
  EditorDocument,
  Paragraph,
  TextNode,
  MathNode,
  ImageNode,
  InkNode,
  GraphNode,
} from "../types";

/**
 * Tworzy unikalny identyfikator.
 */
function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Tworzy pusty dokument.
 */
export function createDocument(): EditorDocument {
  return {
    version: DOCUMENT_VERSION,
    paragraphs: [createParagraph()],
  };
}

/**
 * Tworzy pusty dokument z jednym pustym TextNode.
 */
export function createEmptyDocument(): EditorDocument {
  return {
    version: DOCUMENT_VERSION,
    paragraphs: [
      {
        id: createId(),
        children: [createTextNode("")],
      },
    ],
  };
}

/**
 * Tworzy nowy akapit.
 */
export function createParagraph(): Paragraph {
  return {
    id: createId(),
    children: [],
  };
}

/**
 * Tworzy TextNode.
 */
export function createTextNode(text = ""): TextNode {
  return {
    id: createId(),
    type: "text",
    text,
  };
}

/**
 * Tworzy MathNode.
 */
export function createMathNode(latex = ""): MathNode {
  return {
    id: createId(),
    type: "math",
    latex,
  };
}

/**
 * Tworzy ImageNode.
 */
export function createImageNode(
  src = "",
  width = 300,
  height = 200,
  alt = ""
): ImageNode {
  return {
    id: createId(),
    type: "image",
    src,
    width,
    height,
    alt,
  };
}

/**
 * Tworzy InkNode.
 */
export function createInkNode(
  strokes: unknown[] = []
): InkNode {
  return {
    id: createId(),
    type: "ink",
    strokes,
  };
}

/**
 * Tworzy GraphNode.
 */
export function createGraphNode(
  expression = ""
): GraphNode {
  return {
    id: createId(),
    type: "graph",
    expression,
  };
}

/**
 * Głęboka kopia dokumentu.
 */
export function cloneDocument(
  document: EditorDocument
): EditorDocument {
  return structuredClone(document);
}

/**
 * Generuje nowe ID.
 * Będzie używane również przez EditorEngine.
 */
export function generateId(): string {
  return createId();
}