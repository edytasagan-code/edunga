import {
  DOCUMENT_VERSION,
  EditorDocument,
  Paragraph,
  TextNode,
  MathNode,
  ImageNode,
  InkNode,
  GraphNode,
  InlineNode,
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
 * Podaj `seed` dla stabilnych ID (SSR/hydration); bez seed — losowe ID (tylko po interakcji).
 */
export function createEmptyDocument(
  seed?: string
): EditorDocument {
  if (seed) {
    return {
      version: DOCUMENT_VERSION,
      paragraphs: [
        {
          id: `p-${seed}`,
          children: [
            {
              id: `t-${seed}`,
              type: "text",
              text: "",
            },
          ],
        },
      ],
    };
  }

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
  alt = "",
  align: ImageNode["align"] = "left"
): ImageNode {
  return {
    id: createId(),
    type: "image",
    src,
    width,
    height,
    alt,
    align,
  };
}

/**
 * Tworzy InkNode.
 */
export function createInkNode(
  width = 400,
  height = 200,
  strokes: InkNode["strokes"] = [],
  align: InkNode["align"] = "left"
): InkNode {
  return {
    id: createId(),
    type: "ink",
    width,
    height,
    strokes,
    align,
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
 * Zapewnia sloty tekstowe między MathNode oraz na końcu akapitu,
 * żeby zawsze można było pisać dalej w tej samej linii.
 */
export function ensureParagraphInlineEditing(
  paragraph: Paragraph
): Paragraph {
  if (paragraph.children.some((node) => node.type === "true-false-table" || node.type === "matching-table" || node.type === "table")) {
    return paragraph;
  }

  if (paragraph.children.length === 0) {
    return {
      ...paragraph,
      children: [createTextNode("")],
    };
  }

  const normalized: InlineNode[] = [];

  for (const node of paragraph.children) {
    const previous = normalized[normalized.length - 1];

    if (node.type === "math" && previous?.type === "math") {
      normalized.push(createTextNode(""));
    }

    normalized.push(node);
  }

  if (normalized[0]?.type === "math") {
    normalized.unshift(createTextNode(""));
  }

  const last = normalized[normalized.length - 1];

  if (last.type === "math") {
    normalized.push(createTextNode(""));
  }

  const unchanged =
    normalized.length === paragraph.children.length &&
    normalized.every((node, index) => {
      const original = paragraph.children[index];

      return (
        original.id === node.id &&
        original.type === node.type &&
        (original.type !== "text" ||
          node.type !== "text" ||
          original.text === node.text) &&
        (original.type !== "math" ||
          node.type !== "math" ||
          original.latex === node.latex)
      );
    });

  if (unchanged) {
    return paragraph;
  }

  return {
    ...paragraph,
    children: normalized,
  };
}

/**
 * Normalizuje dokument do edycji inline.
 */
export function ensureDocumentInlineEditing(
  document: EditorDocument
): EditorDocument {
  const paragraphs = document.paragraphs.map(
    ensureParagraphInlineEditing
  );

  const changed = paragraphs.some(
    (paragraph, index) =>
      paragraph !== document.paragraphs[index]
  );

  if (!changed) {
    return document;
  }

  return {
    ...document,
    paragraphs,
  };
}

/**
 * Zapewnia sloty tekstowe wokół ImageNode — tylko w edytorze (nie w imporcie).
 */
export function ensureParagraphImageEditing(
  paragraph: Paragraph
): Paragraph {
  if (paragraph.children.some((node) => node.type === "true-false-table" || node.type === "matching-table" || node.type === "table")) {
    return paragraph;
  }

  if (!paragraph.children.some((node) => node.type === "image" || node.type === "ink")) {
    return paragraph;
  }

  if (paragraph.children.length === 0) {
    return {
      ...paragraph,
      children: [createTextNode("")],
    };
  }

  const normalized: InlineNode[] = [];

  for (const node of paragraph.children) {
    const previous = normalized[normalized.length - 1];

    if (
      (node.type === "image" ||
        node.type === "ink" ||
        node.type === "math") &&
      (previous?.type === "image" ||
        previous?.type === "ink" ||
        previous?.type === "math")
    ) {
      normalized.push(createTextNode(""));
    }

    normalized.push(node);
  }

  if (
    normalized[0]?.type === "image" ||
    normalized[0]?.type === "ink" ||
    normalized[0]?.type === "math"
  ) {
    normalized.unshift(createTextNode(""));
  }

  const last = normalized[normalized.length - 1];

  if (last.type === "image" || last.type === "ink" || last.type === "math") {
    normalized.push(createTextNode(""));
  }

  const unchanged =
    normalized.length === paragraph.children.length &&
    normalized.every((node, index) => {
      const original = paragraph.children[index];

      return (
        original.id === node.id &&
        original.type === node.type &&
        (original.type !== "text" ||
          node.type !== "text" ||
          original.text === node.text)
      );
    });

  if (unchanged) {
    return paragraph;
  }

  return {
    ...paragraph,
    children: normalized,
  };
}

export function ensureDocumentImageEditing(
  document: EditorDocument
): EditorDocument {
  const paragraphs = document.paragraphs.map(
    ensureParagraphImageEditing
  );

  const changed = paragraphs.some(
    (paragraph, index) =>
      paragraph !== document.paragraphs[index]
  );

  if (!changed) {
    return document;
  }

  return {
    ...document,
    paragraphs,
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