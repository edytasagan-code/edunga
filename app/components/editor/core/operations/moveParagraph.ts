import {
  ensureDocumentImageEditing,
  ensureDocumentInlineEditing,
} from "../document";
import type { EditorDocument } from "../../types";

function normalizeDocument(document: EditorDocument): EditorDocument {
  return ensureDocumentImageEditing(ensureDocumentInlineEditing(document));
}

export function moveParagraphByIndex(
  document: EditorDocument,
  fromIndex: number,
  toIndex: number
): EditorDocument {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= document.paragraphs.length ||
    toIndex >= document.paragraphs.length
  ) {
    return document;
  }

  const paragraphs = [...document.paragraphs];
  const [item] = paragraphs.splice(fromIndex, 1);
  paragraphs.splice(toIndex, 0, item);

  return normalizeDocument({
    ...document,
    paragraphs,
  });
}

export function moveParagraphsByIndex(
  document: EditorDocument,
  paragraphIds: readonly string[],
  targetIndex: number
): EditorDocument {
  if (paragraphIds.length === 0) {
    return document;
  }

  const idSet = new Set(paragraphIds);
  const moving = document.paragraphs.filter((paragraph) =>
    idSet.has(paragraph.id)
  );
  const remaining = document.paragraphs.filter(
    (paragraph) => !idSet.has(paragraph.id)
  );

  const clampedTarget = Math.max(
    0,
    Math.min(targetIndex, remaining.length)
  );

  const paragraphs = [
    ...remaining.slice(0, clampedTarget),
    ...moving,
    ...remaining.slice(clampedTarget),
  ];

  return normalizeDocument({
    ...document,
    paragraphs,
  });
}

export default function moveParagraph(
  document: EditorDocument,
  paragraphId: string,
  direction: -1 | 1
): EditorDocument {
  const index = document.paragraphs.findIndex(
    (paragraph) => paragraph.id === paragraphId
  );

  if (index === -1) {
    return document;
  }

  return moveParagraphByIndex(document, index, index + direction);
}
