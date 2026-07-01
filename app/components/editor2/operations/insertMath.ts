import { DocumentModel } from "../types";

export default function insertMath(
  document: DocumentModel,
  paragraphIndex: number,
  nodeIndex: number,
  offset: number
): DocumentModel {

  const next = structuredClone(document);

  const paragraph =
    next.paragraphs[paragraphIndex];

  const node = paragraph.nodes[nodeIndex];

  if (node.type !== "text") {
    return next;
  }

  const before = node.text.slice(0, offset);
  const after = node.text.slice(offset);

  paragraph.nodes.splice(
    nodeIndex,
    1,

    {
      id: crypto.randomUUID(),
      type: "text",
      text: before,
    },

    {
      id: crypto.randomUUID(),
      type: "math",
      latex: "",
    },

    {
      id: crypto.randomUUID(),
      type: "text",
      text: after,
    }
  );

  return next;
}