import {
  ensureDocumentImageEditing,
  ensureDocumentInlineEditing,
} from "../document";
import type { EditorDocument } from "../../types";
import { cloneParagraph, cloneParagraphs } from "./cloneParagraphNodes";

function normalizeDocument(document: EditorDocument): EditorDocument {
  return ensureDocumentImageEditing(ensureDocumentInlineEditing(document));
}

export default function duplicateParagraph(
  document: EditorDocument,
  paragraphId: string
): EditorDocument {
  const index = document.paragraphs.findIndex(
    (paragraph) => paragraph.id === paragraphId
  );

  if (index === -1) {
    return document;
  }

  const copy = cloneParagraph(document.paragraphs[index]);
  const paragraphs = [...document.paragraphs];
  paragraphs.splice(index + 1, 0, copy);

  return normalizeDocument({
    ...document,
    paragraphs,
  });
}

export function duplicateParagraphs(
  document: EditorDocument,
  paragraphIds: readonly string[]
): EditorDocument {
  if (paragraphIds.length === 0) {
    return document;
  }

  const idSet = new Set(paragraphIds);
  const paragraphs = [...document.paragraphs];
  let offset = 0;

  for (let index = 0; index < document.paragraphs.length; index += 1) {
    const paragraph = document.paragraphs[index];

    if (!idSet.has(paragraph.id)) {
      continue;
    }

    const copies = cloneParagraphs(document, [paragraph.id]);
    paragraphs.splice(index + 1 + offset, 0, ...copies);
    offset += copies.length;
  }

  return normalizeDocument({
    ...document,
    paragraphs,
  });
}
