import { EditorDocument } from "../../types";
import { generateId } from "../document";

export type InsertMathResult = {
  document: EditorDocument;
  insertedNodeId: string;
};

export default function insertMath(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  offset: number,
  selectionEnd?: number
): InsertMathResult {
  const insertedNodeId = generateId();

  const nextDocument: EditorDocument = {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      const index = paragraph.children.findIndex(
        (node) => node.id === nodeId
      );

      if (index === -1) {
        return paragraph;
      }

      const node = paragraph.children[index];

      if (node.type !== "text") {
        return paragraph;
      }

      const insertEnd =
        selectionEnd !== undefined && selectionEnd > offset
          ? selectionEnd
          : offset;

      const before = node.text.slice(0, offset);
      const after = node.text.slice(insertEnd);

      const newChildren = [] as typeof paragraph.children;

      if (before.length > 0) {
        newChildren.push({
          id: generateId(),
          type: "text",
          text: before,
        });
      }

      newChildren.push({
        id: insertedNodeId,
        type: "math",
        latex: "",
      });

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

      return {
        ...paragraph,
        children: [
          ...paragraph.children.slice(0, index),
          ...newChildren,
          ...paragraph.children.slice(index + 1),
        ],
      };
    }),
  };

  return {
    document: nextDocument,
    insertedNodeId,
  };
}
