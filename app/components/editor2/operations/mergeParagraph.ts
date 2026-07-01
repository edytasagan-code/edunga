import { DocumentModel } from "../types";

export default function mergeParagraph(
  document: DocumentModel,
  paragraphIndex: number
): DocumentModel {

  if (paragraphIndex === 0) {
    return document;
  }

  const next = structuredClone(document);

  const previous =
    next.paragraphs[paragraphIndex - 1];

  const current =
    next.paragraphs[paragraphIndex];

  previous.nodes.push(...current.nodes);

  next.paragraphs.splice(
    paragraphIndex,
    1
  );

  return next;
}