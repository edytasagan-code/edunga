import { readLiveTextFromNode } from "./selection";
import { focusInlineMathNode } from "./focusInlineMath";
import type { DocumentPoint } from "./selectionModel";
import type { EditorDocument, InlineNode } from "./types";
import { getOrderedRangeStart } from "./documentRange";
export type CaretRestoreTarget =
  | {
      kind: "text";
      paragraphId: string;
      nodeId: string;
      offset: number;
    }
  | {
      kind: "math";
      paragraphId: string;
      nodeId: string;
      side: "start" | "end";
    };

/**
 * Syncs live DOM text into the document model for one paragraph so merges
 * and caret math use what the user actually sees.
 */
export function syncParagraphLiveText(
  paragraphId: string,
  children: InlineNode[],
  editorRoot: HTMLElement
): InlineNode[] {
  return children.map((node) => {
    if (node.type !== "text") {
      return node;
    }

    const live = readLiveTextFromNode(
      editorRoot,
      paragraphId,
      node.id
    );

    if (live === null || live === node.text) {
      return node;
    }

    return {
      ...node,
      text: live,
    };
  });
}

/**
 * Character offset in paragraph text stream immediately before `mathIndex`.
 */
export function computeJunctionOffset(
  paragraphId: string,
  mathIndex: number,
  children: InlineNode[],
  editorRoot: HTMLElement | null
): number {
  let offset = 0;

  for (let index = 0; index < mathIndex; index += 1) {
    const node = children[index];

    if (node.type !== "text") {
      continue;
    }

    const live =
      editorRoot === null
        ? null
        : readLiveTextFromNode(
            editorRoot,
            paragraphId,
            node.id
          );

    offset += live?.length ?? node.text.length;
  }

  return offset;
}

/**
 * Maps a paragraph-level text offset onto a concrete text node after removal.
 */
export function mapOffsetToTextNode(
  childrenAfterRemoval: InlineNode[],
  paragraphOffset: number
): { nodeId: string; offset: number } | null {
  let walked = 0;

  for (const node of childrenAfterRemoval) {
    if (node.type !== "text") {
      continue;
    }

    const end = walked + node.text.length;

    if (paragraphOffset <= end) {
      return {
        nodeId: node.id,
        offset: paragraphOffset - walked,
      };
    }

    walked = end;
  }

  const lastText = [...childrenAfterRemoval]
    .reverse()
    .find((node) => node.type === "text");

  if (lastText?.type === "text") {
    return {
      nodeId: lastText.id,
      offset: lastText.text.length,
    };
  }

  return null;
}

/**
 * Computes where the caret belongs after an inline math node is removed.
 *
 * The caret stays at the paragraph-level junction where the math object was,
 * not at the end of the following text node.
 */
export function resolveCaretAfterMathRemoval(
  paragraphId: string,
  removedIndex: number,
  childrenBeforeRemoval: InlineNode[],
  childrenAfterRemoval: InlineNode[],
  editorRoot: HTMLElement | null
): CaretRestoreTarget | null {
  const previousNode = childrenBeforeRemoval[removedIndex - 1];
  const nextNode = childrenBeforeRemoval[removedIndex + 1];

  if (
    previousNode?.type === "text" ||
    nextNode?.type === "text"
  ) {
    const junctionOffset = computeJunctionOffset(
      paragraphId,
      removedIndex,
      childrenBeforeRemoval,
      editorRoot
    );

    const mapped = mapOffsetToTextNode(
      childrenAfterRemoval,
      junctionOffset
    );

    if (mapped) {
      return {
        kind: "text",
        paragraphId,
        nodeId: mapped.nodeId,
        offset: mapped.offset,
      };
    }
  }

  if (previousNode?.type === "math") {
    return {
      kind: "math",
      paragraphId,
      nodeId: previousNode.id,
      side: "end",
    };
  }

  if (nextNode?.type === "math") {
    return {
      kind: "math",
      paragraphId,
      nodeId: nextNode.id,
      side: "start",
    };
  }

  const fallbackText = childrenAfterRemoval.find(
    (node) => node.type === "text"
  );

  if (fallbackText?.type === "text") {
    return {
      kind: "text",
      paragraphId,
      nodeId: fallbackText.id,
      offset: 0,
    };
  }

  return null;
}

export function applyCaretRestoreTarget(
  target: CaretRestoreTarget,
  root: HTMLElement
): boolean {
  if (target.kind === "text") {
    const element = root.querySelector(
      `[data-paragraph-id="${target.paragraphId}"] [data-node-id="${target.nodeId}"][data-node-type="text"]`
    ) as HTMLElement | null;

    if (!element) {
      return false;
    }

    element.focus();

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    let textChild = element.firstChild;

    if (!textChild || textChild.nodeType !== Node.TEXT_NODE) {
      textChild = document.createTextNode("");
      element.replaceChildren(textChild);
    }

    const max = textChild.textContent?.length ?? 0;
    const offset = Math.max(0, Math.min(target.offset, max));
    const range = document.createRange();

    range.setStart(textChild, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    return true;
  }

  const field = root.querySelector(
    `[data-paragraph-id="${target.paragraphId}"] [data-node-id="${target.nodeId}"] math-field`
  );

  if (!field) {
    return false;
  }

  return focusInlineMathNode(
    target.paragraphId,
    target.nodeId,
    target.side,
    root
  );
}

export function computeParagraphStreamOffset(
  document: EditorDocument,
  point: DocumentPoint,
  editorRoot: HTMLElement
): { paragraphId: string; offset: number } | null {
  const paragraph = document.paragraphs.find(
    (item) => item.id === point.paragraphId
  );

  if (!paragraph) {
    return null;
  }

  let streamOffset = 0;

  for (const node of paragraph.children) {
    if (node.id === point.nodeId) {
      if (point.kind === "text") {
        return {
          paragraphId: point.paragraphId,
          offset: streamOffset + point.offset,
        };
      }

      if (point.kind === "math") {
        return {
          paragraphId: point.paragraphId,
          offset: streamOffset,
        };
      }
    }

    if (node.type === "text") {
      const live =
        readLiveTextFromNode(
          editorRoot,
          paragraph.id,
          node.id
        ) ?? node.text;

      streamOffset += live.length;
    }
  }

  return null;
}

export function resolveCaretAfterRangeDelete(
  anchor: DocumentPoint,
  focus: DocumentPoint,
  sourceDocument: EditorDocument,
  resultDocument: EditorDocument,
  editorRoot: HTMLElement
): CaretRestoreTarget | null {
  const start = getOrderedRangeStart(
    anchor,
    focus,
    sourceDocument
  );

  if (!start) {
    return null;
  }

  if (start.kind === "math") {
    const resultParagraph = resultDocument.paragraphs.find(
      (item) => item.id === start.paragraphId
    );
    const mathNode = resultParagraph?.children.find(
      (item) => item.id === start.nodeId && item.type === "math"
    );

    if (mathNode?.type === "math") {
      return {
        kind: "math",
        paragraphId: start.paragraphId,
        nodeId: start.nodeId,
        side: "start",
      };
    }
  }

  const stream = computeParagraphStreamOffset(
    sourceDocument,
    start,
    editorRoot
  );

  if (!stream) {
    return null;
  }

  const resultParagraph = resultDocument.paragraphs.find(
    (item) => item.id === stream.paragraphId
  );

  if (!resultParagraph) {
    return null;
  }

  const mapped = mapOffsetToTextNode(
    resultParagraph.children,
    stream.offset
  );

  if (!mapped) {
    return null;
  }

  return {
    kind: "text",
    paragraphId: stream.paragraphId,
    nodeId: mapped.nodeId,
    offset: mapped.offset,
  };
}

export function resolveCaretFromCursorPosition(
  position: {
    paragraphId: string;
    nodeId: string;
    offset: number;
  },
  document: EditorDocument
): CaretRestoreTarget | null {
  const paragraph = document.paragraphs.find(
    (item) => item.id === position.paragraphId
  );

  if (!paragraph) {
    return null;
  }

  const node = paragraph.children.find(
    (item) => item.id === position.nodeId
  );

  if (node?.type === "text") {
    return {
      kind: "text",
      paragraphId: position.paragraphId,
      nodeId: position.nodeId,
      offset: Math.min(position.offset, node.text.length),
    };
  }

  if (node?.type === "math") {
    return {
      kind: "math",
      paragraphId: position.paragraphId,
      nodeId: position.nodeId,
      side: position.offset > 0 ? "end" : "start",
    };
  }

  const mapped = mapOffsetToTextNode(
    paragraph.children,
    position.offset
  );

  if (!mapped) {
    return null;
  }

  return {
    kind: "text",
    paragraphId: position.paragraphId,
    nodeId: mapped.nodeId,
    offset: mapped.offset,
  };
}