import { EditorDocument, InlineNode } from "../../types";
import {
  createTextNode,
  ensureParagraphInlineEditing,
} from "../document";

export default function removeNode(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string
): EditorDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      const children = paragraph.children.filter(
        (node) => node.id !== nodeId
      );

      // Nigdy nie zostawiamy pustego akapitu
      if (children.length === 0) {
        return {
          ...paragraph,
          children: [createTextNode("")],
        };
      }

      // Scal sąsiednie TextNode
      const merged: InlineNode[] = [];

      for (const node of children) {
        const previous = merged[merged.length - 1];

        if (
          previous &&
          previous.type === "text" &&
          node.type === "text"
        ) {
          previous.text += node.text;
        } else {
          merged.push(node);
        }
      }

      return ensureParagraphInlineEditing({
        ...paragraph,
        children: merged,
      });
    }),
  };
}