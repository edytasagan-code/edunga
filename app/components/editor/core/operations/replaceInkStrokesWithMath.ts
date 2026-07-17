import {
  createMathNode,
  createTextNode,
  ensureDocumentInlineEditing,
  ensureParagraphInlineEditing,
} from "../document";
import type { EditorDocument, InlineNode, InkNode } from "../../types";
import { removeStrokesByIndex } from "@/app/lib/ink-hwr/strokes";

export type ReplaceInkStrokesWithMathResult = {
  document: EditorDocument;
  insertedMathIds: string[];
};

/**
 * Remove selected strokes from an ink node and insert MathNode(s) in their place.
 * Never touches other paragraphs or remaining handwriting.
 */
export default function replaceInkStrokesWithMath(
  document: EditorDocument,
  paragraphId: string,
  inkNodeId: string,
  strokeIndices: number[],
  latexList: string[]
): ReplaceInkStrokesWithMathResult {
  const latexNodes = latexList
    .map((latex) => latex.trim())
    .filter(Boolean)
    .map((latex) => createMathNode(latex));

  if (latexNodes.length === 0) {
    return { document, insertedMathIds: [] };
  }

  const insertedMathIds = latexNodes.map((node) => node.id);
  const indices =
    strokeIndices.length > 0
      ? strokeIndices
      : // empty → convert entire ink block
        (() => {
          const paragraph = document.paragraphs.find(
            (item) => item.id === paragraphId
          );
          const ink = paragraph?.children.find(
            (node) => node.id === inkNodeId && node.type === "ink"
          ) as InkNode | undefined;
          return ink ? ink.strokes.map((_, index) => index) : [];
        })();

  const nextDocument: EditorDocument = {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      const inkIndex = paragraph.children.findIndex(
        (node) => node.id === inkNodeId && node.type === "ink"
      );

      if (inkIndex === -1) {
        return paragraph;
      }

      const ink = paragraph.children[inkIndex] as InkNode;
      const remaining = removeStrokesByIndex(ink.strokes, indices);
      const before = paragraph.children.slice(0, inkIndex);
      const after = paragraph.children.slice(inkIndex + 1);

      const mathChunk: InlineNode[] = [];
      for (const math of latexNodes) {
        mathChunk.push(math);
        mathChunk.push(createTextNode(""));
      }

      let children: InlineNode[];

      if (remaining.length === 0) {
        children = [...before, ...mathChunk, ...after];
      } else {
        children = [
          ...before,
          { ...ink, strokes: remaining },
          createTextNode(""),
          ...mathChunk,
          ...after,
        ];
      }

      return ensureParagraphInlineEditing({
        ...paragraph,
        children,
      });
    }),
  };

  return {
    document: ensureDocumentInlineEditing(nextDocument),
    insertedMathIds,
  };
}
