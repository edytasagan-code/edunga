import { DocumentModel } from "../types";

export default function splitParagraph(
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

  paragraph.nodes[nodeIndex] = {
    ...node,
    text: before,
  };

  next.paragraphs.splice(
    paragraphIndex + 1,
    0,
    {
      id: crypto.randomUUID(),
      nodes: [
        {
          id: crypto.randomUUID(),
          type: "text",
          text: after,
        },
      ],
    }
  );

  return next;
}