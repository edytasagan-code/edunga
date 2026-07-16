import type { CursorPosition } from "./core/cursor";
import type { EditorDocument } from "./types";

export type ResolvedInsertPosition = CursorPosition & {
  liveText: string;
  /** When text is selected, the exclusive end offset (offset is the start). */
  selectionEnd?: number;
};

function findTextNodeElement(
  editorRoot: HTMLElement,
  paragraphId: string,
  nodeId: string
): HTMLElement | null {
  const element = editorRoot.querySelector(
    `[data-paragraph-id="${paragraphId}"] [data-node-id="${nodeId}"][data-node-type="text"]`
  );

  return element instanceof HTMLElement ? element : null;
}

export function measureTextOffset(
  textElement: HTMLElement,
  range: Range
): number {
  if (!textElement.contains(range.startContainer)) {
    return 0;
  }

  const textChild = textElement.firstChild;

  if (textChild?.nodeType === Node.TEXT_NODE) {
    const text = textChild.textContent ?? "";

    if (range.startContainer === textChild) {
      return Math.max(0, Math.min(range.startOffset, text.length));
    }

    if (range.startContainer === textElement) {
      return range.startOffset === 0 ? 0 : text.length;
    }

    const preRange = document.createRange();
    preRange.setStart(textChild, 0);
    preRange.setEnd(range.startContainer, range.startOffset);

    return Math.max(
      0,
      Math.min(preRange.toString().length, text.length)
    );
  }

  return Math.max(0, range.startOffset);
}

export function readLiveTextFromNode(
  editorRoot: HTMLElement,
  paragraphId: string,
  nodeId: string
): string | null {
  const element = findTextNodeElement(
    editorRoot,
    paragraphId,
    nodeId
  );

  if (!element) {
    return null;
  }

  return element.textContent ?? "";
}

function isKnownTextNode(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string
): boolean {
  const paragraph = document.paragraphs.find(
    (item) => item.id === paragraphId
  );

  if (!paragraph) {
    return false;
  }

  const node = paragraph.children.find(
    (item) => item.id === nodeId
  );

  return node?.type === "text";
}

/**
 * Resolves the insert position from the current DOM selection when the
 * caret is inside this editor's text node.
 */
export function resolveInsertPositionFromSelection(
  document: EditorDocument,
  editorRoot: HTMLElement
): ResolvedInsertPosition | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!editorRoot.contains(range.startContainer)) {
    return null;
  }

  const textElement = (
    range.startContainer.nodeType === Node.ELEMENT_NODE &&
    (range.startContainer as Element).matches(
      "[data-node-type='text']"
    )
      ? (range.startContainer as HTMLElement)
      : (range.startContainer as Node).parentElement?.closest(
          "[data-node-type='text']"
        )
  ) as HTMLElement | null;

  if (!textElement || !editorRoot.contains(textElement)) {
    return null;
  }

  const paragraphElement = textElement.closest(
    "[data-paragraph-id]"
  );

  if (
    !paragraphElement ||
    !editorRoot.contains(paragraphElement)
  ) {
    return null;
  }

  const paragraphId =
    paragraphElement.getAttribute("data-paragraph-id");
  const nodeId = textElement.getAttribute("data-node-id");

  if (!paragraphId || !nodeId) {
    return null;
  }

  if (!isKnownTextNode(document, paragraphId, nodeId)) {
    return null;
  }

  const liveText = textElement.textContent ?? "";
  const startOffset = measureTextOffset(textElement, range);

  if (!range.collapsed) {
    const endRange = range.cloneRange();
    endRange.collapse(false);
    const endOffset = measureTextOffset(textElement, endRange);

    return {
      paragraphId,
      nodeId,
      offset: Math.min(startOffset, endOffset),
      selectionEnd: Math.max(startOffset, endOffset),
      liveText,
    };
  }

  return {
    paragraphId,
    nodeId,
    offset: startOffset,
    liveText,
  };
}

/**
 * Returns the editor surface that currently owns keyboard focus.
 */
export function resolveFocusedEditorSurface(): HTMLElement | null {
  const active = window.document.activeElement;

  if (active instanceof HTMLElement) {
    const surface = active.closest(".edunga-editor-surface");

    if (surface instanceof HTMLElement) {
      return surface;
    }
  }

  if (active instanceof Element) {
    const root = active.getRootNode();

    if (root instanceof ShadowRoot) {
      const host = root.host;

      if (host instanceof HTMLElement) {
        const surface = host.closest(".edunga-editor-surface");

        if (surface instanceof HTMLElement) {
          return surface;
        }
      }
    }
  }

  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const anchor = selection.anchorNode;

    if (anchor) {
      const anchorElement =
        anchor.nodeType === Node.ELEMENT_NODE
          ? (anchor as Element)
          : anchor.parentElement;
      const surface = anchorElement?.closest(
        ".edunga-editor-surface"
      );

      if (surface instanceof HTMLElement) {
        return surface;
      }
    }
  }

  return null;
}

export { selectAllEditorContent } from "./selectionModel";

export function resolveInsertPositionFromStoredCursor(
  document: EditorDocument,
  editorRoot: HTMLElement,
  position: CursorPosition
): ResolvedInsertPosition | null {
  if (!isKnownTextNode(document, position.paragraphId, position.nodeId)) {
    return null;
  }

  const liveText = readLiveTextFromNode(
    editorRoot,
    position.paragraphId,
    position.nodeId
  );

  if (liveText === null) {
    return null;
  }

  return {
    paragraphId: position.paragraphId,
    nodeId: position.nodeId,
    offset: Math.max(
      0,
      Math.min(position.offset, liveText.length)
    ),
    liveText,
  };
}
