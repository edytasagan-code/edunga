import type { ImageAlign, InkStroke } from "../../types";
import { EditorDocument } from "../../types";

export type InkPatch = {
  width?: number;
  height?: number;
  strokes?: InkStroke[];
  align?: ImageAlign;
};

export default function updateInk(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  patch: InkPatch
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
          if (node.id !== nodeId || node.type !== "ink") {
            return node;
          }

          return {
            ...node,
            ...patch,
          };
        }),
      };
    }),
  };
}
