import {
  createEmptyDocument,
  ensureDocumentImageEditing,
  ensureDocumentInlineEditing,
} from "../document";
import type { EditorDocument } from "../../types";

function normalizeDocument(document: EditorDocument): EditorDocument {
  return ensureDocumentImageEditing(ensureDocumentInlineEditing(document));
}

export default function deleteParagraphs(
  document: EditorDocument,
  paragraphIds: readonly string[]
): EditorDocument {
  if (paragraphIds.length === 0) {
    return document;
  }

  const idSet = new Set(paragraphIds);
  const paragraphs = document.paragraphs.filter(
    (paragraph) => !idSet.has(paragraph.id)
  );

  if (paragraphs.length === 0) {
    return normalizeDocument(createEmptyDocument());
  }

  return normalizeDocument({
    ...document,
    paragraphs,
  });
}
