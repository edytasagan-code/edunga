import { EditorDocument } from "../../types";
import { generateId } from "../document";

export default function insertText(
  document: EditorDocument,
  paragraphId: string,
  afterNodeId: string
): EditorDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      const index = paragraph.children.findIndex(
        (node) => node.id === afterNodeId
      );

      if (index === -1) {
        return paragraph;
      }

      const textNode = {
        id: generateId(),
        type: "text" as const,
        text: "",
      };

      return {
        ...paragraph,
        children: [
          ...paragraph.children.slice(0, index + 1),
          textNode,
          ...paragraph.children.slice(index + 1),
        ],
      };
    }),
  };
}
