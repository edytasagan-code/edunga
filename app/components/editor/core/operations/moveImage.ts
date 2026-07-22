import { EditorDocument, ImageNode, InlineNode } from "../../types";
import {
  createTextNode,
  ensureParagraphInlineEditing,
  generateId,
} from "../document";

export default function moveImage(
  document: EditorDocument,
  sourceParagraphId: string,
  imageNodeId: string,
  targetParagraphId: string,
  targetTextNodeId: string,
  targetOffset: number
): EditorDocument {
  let movedNode: ImageNode | null = null;

  const withoutSource = {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== sourceParagraphId) {
        return paragraph;
      }

      const index = paragraph.children.findIndex(
        (node) => node.id === imageNodeId
      );

      if (index === -1) {
        return paragraph;
      }

      const candidate = paragraph.children[index];

      if (candidate.type !== "image") {
        return paragraph;
      }

      movedNode = candidate;

      const children = paragraph.children.filter(
        (node) => node.id !== imageNodeId
      );

      if (children.length === 0) {
        return {
          ...paragraph,
          children: [createTextNode("")],
        };
      }

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

  if (!movedNode) {
    return document;
  }

  const imageNode = movedNode;

  return {
    ...withoutSource,
    paragraphs: withoutSource.paragraphs.map((paragraph) => {
      if (paragraph.id !== targetParagraphId) {
        return paragraph;
      }

      const index = paragraph.children.findIndex(
        (node) => node.id === targetTextNodeId
      );

      if (index === -1) {
        return paragraph;
      }

      const node = paragraph.children[index];

      if (node.type !== "text") {
        return paragraph;
      }

      const before = node.text.slice(0, targetOffset);
      const after = node.text.slice(targetOffset);

      const newChildren: InlineNode[] = [];

      if (before.length > 0) {
        newChildren.push({
          id: generateId(),
          type: "text",
          text: before,
        });
      }

      newChildren.push(imageNode);

      if (after.length > 0) {
        newChildren.push({
          id: generateId(),
          type: "text",
          text: after,
        });
      } else {
        newChildren.push({
          id: generateId(),
          type: "text",
          text: "",
        });
      }

      return ensureParagraphInlineEditing({
        ...paragraph,
        children: [
          ...paragraph.children.slice(0, index),
          ...newChildren,
          ...paragraph.children.slice(index + 1),
        ],
      });
    }),
  };
}
