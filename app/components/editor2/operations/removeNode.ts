import { DocumentModel } from "../types";

export default function removeNode(
  document: DocumentModel,
  paragraphIndex: number,
  nodeIndex: number
): DocumentModel {

  const next = structuredClone(document);

  next.paragraphs[
    paragraphIndex
  ].nodes.splice(nodeIndex, 1);

  return next;
}