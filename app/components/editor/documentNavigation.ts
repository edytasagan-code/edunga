import type { EditorDocument } from "./types";
import { focusInlineMathNode } from "./focusInlineMath";
import { focusInlineTextNode } from "./focusInlineText";

function findParagraphIndex(
  document: EditorDocument,
  paragraphId: string
): number {
  return document.paragraphs.findIndex(
    (paragraph) => paragraph.id === paragraphId
  );
}

function focusParagraphEnd(
  document: EditorDocument,
  paragraphIndex: number,
  editorRoot: HTMLElement | null
): boolean {
  const paragraph = document.paragraphs[paragraphIndex];

  if (!paragraph) {
    return false;
  }

  for (let index = paragraph.children.length - 1; index >= 0; index -= 1) {
    const node = paragraph.children[index];

    if (node.type === "text") {
      return focusInlineTextNode(
        paragraph.id,
        node.id,
        node.text.length,
        editorRoot
      );
    }

    if (node.type === "math") {
      return focusInlineMathNode(
        paragraph.id,
        node.id,
        "end",
        editorRoot
      );
    }
  }

  return false;
}

function focusParagraphStart(
  document: EditorDocument,
  paragraphIndex: number,
  editorRoot: HTMLElement | null
): boolean {
  const paragraph = document.paragraphs[paragraphIndex];

  if (!paragraph) {
    return false;
  }

  for (const node of paragraph.children) {
    if (node.type === "text") {
      return focusInlineTextNode(
        paragraph.id,
        node.id,
        0,
        editorRoot
      );
    }

    if (node.type === "math") {
      return focusInlineMathNode(
        paragraph.id,
        node.id,
        "start",
        editorRoot
      );
    }
  }

  return false;
}

export function focusPreviousParagraph(
  document: EditorDocument,
  paragraphId: string,
  editorRoot: HTMLElement | null
): boolean {
  const index = findParagraphIndex(document, paragraphId);

  if (index <= 0) {
    return false;
  }

  return focusParagraphEnd(
    document,
    index - 1,
    editorRoot
  );
}

export function focusNextParagraph(
  document: EditorDocument,
  paragraphId: string,
  editorRoot: HTMLElement | null
): boolean {
  const index = findParagraphIndex(document, paragraphId);

  if (
    index === -1 ||
    index >= document.paragraphs.length - 1
  ) {
    return false;
  }

  return focusParagraphStart(
    document,
    index + 1,
    editorRoot
  );
}
