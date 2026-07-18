/**
 * Geometry helpers for vertical caret movement inside a text inline node.
 */

function getCollapsedCaretRect(): DOMRect | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed) {
    return null;
  }

  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return rect;
}

function getLineRectAtOffset(
  element: HTMLElement,
  offset: number
): DOMRect | null {
  const textChild = element.firstChild;

  if (textChild?.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const length = textChild.textContent?.length ?? 0;
  const clamped = Math.max(0, Math.min(offset, length));
  const range = document.createRange();

  try {
    range.setStart(textChild, clamped);
    range.collapse(true);
  } catch {
    return null;
  }

  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return rect;
}

export function isCaretOnFirstLine(
  element: HTMLElement
): boolean {
  const caret = getCollapsedCaretRect();

  if (!caret) {
    return true;
  }

  const lineStart = getLineRectAtOffset(element, 0);

  if (!lineStart) {
    return true;
  }

  return Math.abs(caret.top - lineStart.top) <= 2;
}

export function isCaretOnLastLine(
  element: HTMLElement
): boolean {
  const caret = getCollapsedCaretRect();

  if (!caret) {
    return true;
  }

  const length = element.textContent?.length ?? 0;
  const lineEnd = getLineRectAtOffset(element, length);

  if (!lineEnd) {
    return true;
  }

  return Math.abs(caret.top - lineEnd.top) <= 2;
}
