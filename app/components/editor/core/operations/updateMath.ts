import { EditorDocument } from "../../types";

export default function updateMath(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  latex: string
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

          if (node.type !== "math") {
            return node;
          }

          return {
            ...node,
            latex,
          };
        }),
      };
    }),
  };
}