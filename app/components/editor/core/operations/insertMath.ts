import { ParagraphModel } from "../../render/DocumentRenderer";

export type InsertMathResult = {
  document: ParagraphModel[];
  insertedNodeId: string;
};

export default function insertMath(
  document: ParagraphModel[],
  paragraphId: string,
  nodeId: string,
  offset: number
): InsertMathResult {
  const insertedNodeId = crypto.randomUUID();

  const nextDocument = document.map((paragraph) => {
    if (paragraph.id !== paragraphId) {
      return paragraph;
    }

    const index = paragraph.nodes.findIndex(
      (node) => node.id === nodeId
    );

    if (index === -1) {
      return paragraph;
    }

    const node = paragraph.nodes[index];

    if (node.type !== "text") {
      return paragraph;
    }

    const before = node.text.slice(0, offset);
    const after = node.text.slice(offset);

    const newNodes = [] as typeof paragraph.nodes;

    if (before.length > 0) {
      newNodes.push({
        id: crypto.randomUUID(),
        type: "text",
        text: before,
      });
    }

    newNodes.push({
      id: insertedNodeId,
      type: "math",
      latex: "",
    });

    if (after.length > 0) {
      newNodes.push({
        id: crypto.randomUUID(),
        type: "text",
        text: after,
      });
    }

    return {
      ...paragraph,
      nodes: [
        ...paragraph.nodes.slice(0, index),
        ...newNodes,
        ...paragraph.nodes.slice(index + 1),
      ],
    };
  });

  return {
    document: nextDocument,
    insertedNodeId,
  };
}
