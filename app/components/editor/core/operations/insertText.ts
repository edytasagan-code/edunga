import { ParagraphModel } from "../../render/DocumentRenderer";

export default function insertText(
  document: ParagraphModel[],
  paragraphId: string,
  afterNodeId: string
): ParagraphModel[] {
  return document.map((paragraph) => {
    if (paragraph.id !== paragraphId) {
      return paragraph;
    }

    const index = paragraph.nodes.findIndex(
      (node) => node.id === afterNodeId
    );

    if (index === -1) {
      return paragraph;
    }

    const textNode = {
      id: crypto.randomUUID(),
      type: "text" as const,
      text: "",
    };

    return {
      ...paragraph,
      nodes: [
        ...paragraph.nodes.slice(0, index + 1),
        textNode,
        ...paragraph.nodes.slice(index + 1),
      ],
    };
  });
}