import { DocumentModel } from "../types";

export default function insertText(
  document: DocumentModel,
  paragraphIndex: number,
  nodeIndex: number,
  offset: number,
  value: string
): DocumentModel {

  const next = structuredClone(document);

  const node =
    next.paragraphs[paragraphIndex].nodes[nodeIndex];

  if (node.type !== "text") {
    return next;
  }

  node.text =
    node.text.slice(0, offset) +
    value +
    node.text.slice(offset);

  return next;
}