import { EditorDocument } from "../../types";

export default function updateText(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  text: string
): EditorDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      return {
        ...paragraph,
        children: paragraph.children.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (node.type !== "text") {
            return node;
          }

          return {
            ...node,
            text,
          };
        }),
      };
    }),
  };
}