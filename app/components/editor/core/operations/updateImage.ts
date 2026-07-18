import type { ImageAlign } from "../../types";
import { EditorDocument } from "../../types";

export type ImagePatch = {
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
  align?: ImageAlign;
};

export default function updateImage(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  patch: ImagePatch
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
          if (node.id !== nodeId || node.type !== "image") {
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
