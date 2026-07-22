import {
  cloneDocument,
  generateId,
} from "../document";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
} from "../../types";

function cloneInlineNode(node: InlineNode): InlineNode {
  const id = generateId();

  if (node.type === "text") {
    return { ...node, id };
  }

  if (node.type === "math") {
    return { ...node, id };
  }

  if (node.type === "image") {
    return { ...node, id };
  }

  if (node.type === "ink") {
    return {
      ...node,
      id,
      strokes: structuredClone(node.strokes),
    };
  }

  if (node.type === "table") {
    return { ...node, id };
  }

  if (node.type === "true-false-table") {
    return {
      ...node,
      id,
      rows: node.rows.map((row) => ({
        ...row,
        id: generateId(),
        statement: row.statement.map(cloneInlineNode),
      })),
    };
  }

  if (node.type === "matching-table") {
    return {
      ...node,
      id,
      options: node.options.map((option) => ({ ...option })),
      rows: node.rows.map((row) => ({
        ...row,
        id: generateId(),
        left: row.left.map(cloneInlineNode),
      })),
    };
  }

  return { ...node, id };
}

export function cloneParagraph(paragraph: Paragraph): Paragraph {
  return {
    id: generateId(),
    children: paragraph.children.map(cloneInlineNode),
  };
}

export function cloneParagraphs(
  document: EditorDocument,
  paragraphIds: readonly string[]
): Paragraph[] {
  const idSet = new Set(paragraphIds);

  return document.paragraphs
    .filter((paragraph) => idSet.has(paragraph.id))
    .map(cloneParagraph);
}

export function cloneDocumentParagraphs(
  document: EditorDocument
): EditorDocument {
  return cloneDocument(document);
}
