import type { CursorPosition } from "./core/cursor";
import type { EditorDocument } from "./types";
import {
  measureTextOffset,
  readLiveTextFromNode,
  resolveInsertPositionFromStoredCursor,
} from "./selection";

export type InlineNodeKind = "text" | "math";

export type DocumentPoint = {
  paragraphId: string;
  nodeId: string;
  kind: InlineNodeKind;
  offset: number;
};

export type EditorSelectionState = {
  anchor: DocumentPoint;
  focus: DocumentPoint;
  collapsed: boolean;
  isFullDocument: boolean;
  insertPosition: ResolvedInsertPosition | null;
};

export type ResolvedInsertPosition = CursorPosition & {
  liveText: string;
  /** When text is selected, the exclusive end offset (offset is the start). */
  selectionEnd?: number;
};

const SELECT_ALL_ATTR = "data-select-all";
const SELECT_ALL_VALUE = "true";
const RANGE_SELECTION_ATTR = "data-editor-range";

export type StoredRangeSelection = {
  anchor: DocumentPoint;
  focus: DocumentPoint;
};

export function clearEditorRangeSelection(
  editorRoot: HTMLElement
): void {
  editorRoot.removeAttribute(RANGE_SELECTION_ATTR);
}

export function setEditorRangeSelection(
  editorRoot: HTMLElement,
  anchor: DocumentPoint,
  focus: DocumentPoint
): void {
  const payload: StoredRangeSelection = {
    anchor,
    focus,
  };

  editorRoot.setAttribute(
    RANGE_SELECTION_ATTR,
    JSON.stringify(payload)
  );
}

export function readEditorRangeSelection(
  editorRoot: HTMLElement
): StoredRangeSelection | null {
  const raw = editorRoot.getAttribute(RANGE_SELECTION_ATTR);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredRangeSelection;

    if (
      !parsed?.anchor?.nodeId ||
      !parsed?.focus?.nodeId
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isEditorRangeSelectionCollapsed(
  selection: StoredRangeSelection
): boolean {
  const { anchor, focus } = selection;

  return (
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.kind === focus.kind &&
    anchor.offset === focus.offset
  );
}

export function isEditorSelectAllActive(
  editorRoot: HTMLElement
): boolean {
  return (
    editorRoot.getAttribute(SELECT_ALL_ATTR) ===
    SELECT_ALL_VALUE
  );
}

export function shouldDeleteEntireEditor(
  document: EditorDocument,
  editorRoot: HTMLElement,
  sessionOverride?: SessionSelectionOverride | null
): boolean {
  if (sessionOverride?.isFullDocument) {
    return true;
  }

  if (isEditorSelectAllActive(editorRoot)) {
    return true;
  }

  const state = readEditorSelection(
    document,
    editorRoot,
    sessionOverride
  );

  return Boolean(
    state &&
      !state.collapsed &&
      state.isFullDocument
  );
}

function getInlineNodes(editorRoot: HTMLElement): Element[] {
  return [
    ...editorRoot.querySelectorAll(
      '[data-node-type="text"], [data-node-type="math"]'
    ),
  ];
}

function findInlineWrapper(
  node: Node | null,
  editorRoot: HTMLElement
): HTMLElement | null {
  if (!node) {
    return null;
  }

  if (node instanceof ShadowRoot) {
    const host = node.host;

    if (host instanceof HTMLElement) {
      return findInlineWrapper(host, editorRoot);
    }

    return null;
  }

  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  if (!element) {
    return null;
  }

  if (
    element instanceof HTMLElement &&
    element.matches("math-field")
  ) {
    const mathWrapper = element.closest(
      '[data-node-type="math"]'
    );

    if (
      mathWrapper instanceof HTMLElement &&
      editorRoot.contains(mathWrapper)
    ) {
      return mathWrapper;
    }
  }

  const wrapper = element.closest(
    '[data-node-type="text"], [data-node-type="math"]'
  );

  if (
    wrapper instanceof HTMLElement &&
    editorRoot.contains(wrapper)
  ) {
    return wrapper;
  }

  const root = node.getRootNode();

  if (root instanceof ShadowRoot) {
    const host = root.host;

    if (host instanceof HTMLElement) {
      return findInlineWrapper(host, editorRoot);
    }
  }

  return null;
}

function getParagraphId(
  wrapper: HTMLElement
): string | null {
  return (
    wrapper
      .closest("[data-paragraph-id]")
      ?.getAttribute("data-paragraph-id") ?? null
  );
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

function comparePoints(
  a: DocumentPoint,
  b: DocumentPoint,
  document: EditorDocument
): number {
  const paragraphIndexA = document.paragraphs.findIndex(
    (item) => item.id === a.paragraphId
  );
  const paragraphIndexB = document.paragraphs.findIndex(
    (item) => item.id === b.paragraphId
  );

  if (paragraphIndexA !== paragraphIndexB) {
    return paragraphIndexA - paragraphIndexB;
  }

  const paragraph = document.paragraphs[paragraphIndexA];

  if (!paragraph) {
    return 0;
  }

  const nodeIndexA = paragraph.children.findIndex(
    (item) => item.id === a.nodeId
  );
  const nodeIndexB = paragraph.children.findIndex(
    (item) => item.id === b.nodeId
  );

  if (nodeIndexA !== nodeIndexB) {
    return nodeIndexA - nodeIndexB;
  }

  if (a.kind === "text" && b.kind === "text") {
    return a.offset - b.offset;
  }

  return 0;
}

function textInsertAdjacentToMath(
  document: EditorDocument,
  editorRoot: HTMLElement,
  paragraphId: string,
  mathNodeId: string,
  side: "before" | "after"
): ResolvedInsertPosition | null {
  const paragraph = document.paragraphs.find(
    (item) => item.id === paragraphId
  );

  if (!paragraph) {
    return null;
  }

  const mathIndex = paragraph.children.findIndex(
    (node) => node.id === mathNodeId
  );

  if (mathIndex === -1) {
    return null;
  }

  const adjacentIndex =
    side === "after" ? mathIndex + 1 : mathIndex - 1;
  const adjacentNode = paragraph.children[adjacentIndex];

  if (adjacentNode?.type !== "text") {
    return null;
  }

  const liveText = readLiveTextFromNode(
    editorRoot,
    paragraphId,
    adjacentNode.id
  );

  if (liveText === null) {
    return null;
  }

  return {
    paragraphId,
    nodeId: adjacentNode.id,
    offset: side === "after" ? 0 : liveText.length,
    liveText,
  };
}

function resolvePointFromDom(
  container: Node,
  offset: number,
  editorRoot: HTMLElement,
  document: EditorDocument
): DocumentPoint | null {
  const wrapper = findInlineWrapper(container, editorRoot);

  if (!wrapper) {
    return null;
  }

  const paragraphId = getParagraphId(wrapper);
  const nodeId = wrapper.getAttribute("data-node-id");
  const kind = wrapper.getAttribute(
    "data-node-type"
  ) as InlineNodeKind | null;

  if (!paragraphId || !nodeId || !kind) {
    return null;
  }

  if (kind === "text") {
    if (!isKnownTextNode(document, paragraphId, nodeId)) {
      return null;
    }

    const range = window.document.createRange();

    try {
      range.setStart(container, offset);
      range.collapse(true);
    } catch {
      return {
        paragraphId,
        nodeId,
        kind: "text",
        offset: 0,
      };
    }

    return {
      paragraphId,
      nodeId,
      kind: "text",
      offset: measureTextOffset(wrapper, range),
    };
  }

  if (kind === "math") {
    return {
      paragraphId,
      nodeId,
      kind: "math",
      offset: 0,
    };
  }

  return null;
}

function selectionTouchesEditor(
  editorRoot: HTMLElement,
  range: Range
): boolean {
  if (
    editorRoot.contains(range.startContainer) ||
    editorRoot.contains(range.endContainer)
  ) {
    return true;
  }

  const active = window.document.activeElement;

  if (
    active instanceof HTMLElement &&
    editorRoot.contains(active)
  ) {
    return true;
  }

  if (active instanceof Element) {
    const root = active.getRootNode();

    if (root instanceof ShadowRoot) {
      const host = root.host;

      if (
        host instanceof HTMLElement &&
        editorRoot.contains(host)
      ) {
        return true;
      }
    }
  }

  return Boolean(
    editorRoot.querySelector("math-field:focus-within")
  );
}

function readFocusedMathPoint(
  editorRoot: HTMLElement,
  document: EditorDocument
): DocumentPoint | null {
  const activeField = editorRoot.querySelector(
    "math-field:focus-within"
  );

  if (!activeField) {
    return null;
  }

  const mathWrapper = activeField.closest(
    '[data-node-type="math"]'
  );

  if (!(mathWrapper instanceof HTMLElement)) {
    return null;
  }

  const paragraphId = getParagraphId(mathWrapper);
  const nodeId = mathWrapper.getAttribute("data-node-id");

  if (!paragraphId || !nodeId) {
    return null;
  }

  const paragraph = document.paragraphs.find(
    (item) => item.id === paragraphId
  );
  const node = paragraph?.children.find(
    (item) => item.id === nodeId
  );

  if (node?.type !== "math") {
    return null;
  }

  return {
    paragraphId,
    nodeId,
    kind: "math",
    offset: 0,
  };
}

function readFocusedTextPoint(
  editorRoot: HTMLElement,
  document: EditorDocument
): DocumentPoint | null {
  const active = window.document.activeElement;

  if (!(active instanceof HTMLElement)) {
    return null;
  }

  const wrapper = findInlineWrapper(active, editorRoot);

  if (
    !wrapper ||
    wrapper.getAttribute("data-node-type") !== "text"
  ) {
    return null;
  }

  const paragraphId = getParagraphId(wrapper);
  const nodeId = wrapper.getAttribute("data-node-id");

  if (!paragraphId || !nodeId) {
    return null;
  }

  if (!isKnownTextNode(document, paragraphId, nodeId)) {
    return null;
  }

  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const point = resolvePointFromDom(
      selection.anchorNode!,
      selection.anchorOffset,
      editorRoot,
      document
    );

    if (point) {
      return point;
    }

    if (wrapper.contains(range.startContainer)) {
      return {
        paragraphId,
        nodeId,
        kind: "text",
        offset: measureTextOffset(wrapper, range),
      };
    }
  }

  const liveText = readLiveTextFromNode(
    editorRoot,
    paragraphId,
    nodeId
  );

  return {
    paragraphId,
    nodeId,
    kind: "text",
    offset: liveText?.length ?? 0,
  };
}

function findFirstTextPoint(
  document: EditorDocument,
  editorRoot: HTMLElement
): ResolvedInsertPosition | null {
  for (const paragraph of document.paragraphs) {
    for (const node of paragraph.children) {
      if (node.type !== "text") {
        continue;
      }

      const liveText = readLiveTextFromNode(
        editorRoot,
        paragraph.id,
        node.id
      );

      if (liveText === null) {
        continue;
      }

      return {
        paragraphId: paragraph.id,
        nodeId: node.id,
        offset: 0,
        liveText,
      };
    }
  }

  return null;
}

export type SessionSelectionOverride = {
  anchor: DocumentPoint;
  focus: DocumentPoint;
  isFullDocument: boolean;
};

function isCollapsedPoints(
  anchor: DocumentPoint,
  focus: DocumentPoint
): boolean {
  return (
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.kind === focus.kind &&
    anchor.offset === focus.offset
  );
}

export function getDocumentEndpoints(
  document: EditorDocument,
  editorRoot: HTMLElement
): {
  first: DocumentPoint;
  last: DocumentPoint;
} | null {
  const first = findFirstDocumentPoint(document, editorRoot);
  const last = findLastDocumentPoint(document, editorRoot);

  if (!first || !last) {
    return null;
  }

  return { first, last };
}

function buildSelectionFromPoints(
  document: EditorDocument,
  editorRoot: HTMLElement,
  anchor: DocumentPoint,
  focus: DocumentPoint,
  isFullDocument: boolean
): EditorSelectionState {
  const collapsed = isCollapsedPoints(anchor, focus);
  const ordered =
    comparePoints(anchor, focus, document) <= 0
      ? { start: anchor, end: focus }
      : { start: focus, end: anchor };

  return {
    anchor,
    focus,
    collapsed,
    isFullDocument: isFullDocument && !collapsed,
    insertPosition: pointToInsertPosition(
      ordered.start,
      collapsed ? null : ordered.end,
      collapsed,
      document,
      editorRoot,
      isFullDocument && !collapsed
    ),
  };
}

function findFirstDocumentPoint(
  document: EditorDocument,
  editorRoot: HTMLElement
): DocumentPoint | null {
  for (const paragraph of document.paragraphs) {
    for (const node of paragraph.children) {
      if (node.type !== "text" && node.type !== "math") {
        continue;
      }

      if (
        !editorRoot.querySelector(
          `[data-paragraph-id="${paragraph.id}"] [data-node-id="${node.id}"]`
        )
      ) {
        continue;
      }

      return {
        paragraphId: paragraph.id,
        nodeId: node.id,
        kind: node.type,
        offset: 0,
      };
    }
  }

  return null;
}

function findLastDocumentPoint(
  document: EditorDocument,
  editorRoot: HTMLElement
): DocumentPoint | null {
  for (let p = document.paragraphs.length - 1; p >= 0; p -= 1) {
    const paragraph = document.paragraphs[p];

    for (let c = paragraph.children.length - 1; c >= 0; c -= 1) {
      const node = paragraph.children[c];

      if (node.type !== "text" && node.type !== "math") {
        continue;
      }

      if (
        !editorRoot.querySelector(
          `[data-paragraph-id="${paragraph.id}"] [data-node-id="${node.id}"]`
        )
      ) {
        continue;
      }

      if (node.type === "text") {
        const liveText = readLiveTextFromNode(
          editorRoot,
          paragraph.id,
          node.id
        );

        return {
          paragraphId: paragraph.id,
          nodeId: node.id,
          kind: "text",
          offset: liveText?.length ?? 0,
        };
      }

      return {
        paragraphId: paragraph.id,
        nodeId: node.id,
        kind: "math",
        offset: 0,
      };
    }
  }

  return null;
}

function pointToInsertPosition(
  start: DocumentPoint,
  end: DocumentPoint | null,
  collapsed: boolean,
  document: EditorDocument,
  editorRoot: HTMLElement,
  isFullDocument = false
): ResolvedInsertPosition | null {
  if (isFullDocument && !collapsed) {
    return findFirstTextPoint(document, editorRoot);
  }

  if (start.kind === "text") {
    const liveText = readLiveTextFromNode(
      editorRoot,
      start.paragraphId,
      start.nodeId
    );

    if (liveText === null) {
      return null;
    }

    if (
      !collapsed &&
      end &&
      end.kind === "text" &&
      end.paragraphId === start.paragraphId &&
      end.nodeId === start.nodeId
    ) {
      const lo = Math.min(start.offset, end.offset);
      const hi = Math.max(start.offset, end.offset);

      return {
        paragraphId: start.paragraphId,
        nodeId: start.nodeId,
        offset: lo,
        selectionEnd: hi > lo ? hi : undefined,
        liveText,
      };
    }

    return {
      paragraphId: start.paragraphId,
      nodeId: start.nodeId,
      offset: Math.max(
        0,
        Math.min(start.offset, liveText.length)
      ),
      liveText,
    };
  }

  if (start.kind === "math") {
    const before = textInsertAdjacentToMath(
      document,
      editorRoot,
      start.paragraphId,
      start.nodeId,
      "before"
    );

    if (before) {
      return before;
    }

    return textInsertAdjacentToMath(
      document,
      editorRoot,
      start.paragraphId,
      start.nodeId,
      "after"
    );
  }

  return null;
}

function isFullDocumentRange(
  editorRoot: HTMLElement,
  range: Range
): boolean {
  const inlineNodes = getInlineNodes(editorRoot);

  if (inlineNodes.length === 0) {
    return false;
  }

  const first = inlineNodes[0];
  const last = inlineNodes[inlineNodes.length - 1];
  const expected = window.document.createRange();

  try {
    expected.setStartBefore(first);
    expected.setEndAfter(last);
  } catch {
    return false;
  }

  const startsAtOrBefore =
    range.compareBoundaryPoints(
      Range.START_TO_START,
      expected
    ) <= 0;
  const endsAtOrAfter =
    range.compareBoundaryPoints(
      Range.END_TO_END,
      expected
    ) >= 0;

  return startsAtOrBefore && endsAtOrAfter;
}

function isFullDocumentPoints(
  document: EditorDocument,
  editorRoot: HTMLElement,
  start: DocumentPoint,
  end: DocumentPoint
): boolean {
  const firstPoint = findFirstDocumentPoint(
    document,
    editorRoot
  );
  const lastPoint = findLastDocumentPoint(
    document,
    editorRoot
  );

  if (!firstPoint || !lastPoint) {
    return false;
  }

  return (
    comparePoints(start, firstPoint, document) <= 0 &&
    comparePoints(end, lastPoint, document) >= 0
  );
}

/**
 * Reads the current DOM selection inside an editor surface and maps it to
 * document-order anchor/focus points plus a text insert position.
 */
export function readEditorSelection(
  document: EditorDocument,
  editorRoot: HTMLElement,
  sessionOverride?: SessionSelectionOverride | null
): EditorSelectionState | null {
  if (sessionOverride) {
    const collapsed = isCollapsedPoints(
      sessionOverride.anchor,
      sessionOverride.focus
    );

    if (sessionOverride.isFullDocument || !collapsed) {
      return buildSelectionFromPoints(
        document,
        editorRoot,
        sessionOverride.anchor,
        sessionOverride.focus,
        sessionOverride.isFullDocument
      );
    }
  }

  if (editorRoot.getAttribute(SELECT_ALL_ATTR) === SELECT_ALL_VALUE) {
    const firstPoint = findFirstDocumentPoint(
      document,
      editorRoot
    );

    if (!firstPoint) {
      return null;
    }

    const lastPoint = findLastDocumentPoint(
      document,
      editorRoot
    );

    return {
      anchor: firstPoint,
      focus: lastPoint ?? firstPoint,
      collapsed: false,
      isFullDocument: true,
      insertPosition: findFirstTextPoint(
        document,
        editorRoot
      ),
    };
  }

  const storedRange = readEditorRangeSelection(editorRoot);

  if (
    storedRange &&
    !isEditorRangeSelectionCollapsed(storedRange)
  ) {
    const ordered =
      comparePoints(
        storedRange.anchor,
        storedRange.focus,
        document
      ) <= 0
        ? {
            start: storedRange.anchor,
            end: storedRange.focus,
          }
        : {
            start: storedRange.focus,
            end: storedRange.anchor,
          };

    return {
      anchor: storedRange.anchor,
      focus: storedRange.focus,
      collapsed: false,
      isFullDocument: isFullDocumentPoints(
        document,
        editorRoot,
        ordered.start,
        ordered.end
      ),
      insertPosition: pointToInsertPosition(
        ordered.start,
        ordered.end,
        false,
        document,
        editorRoot,
        false
      ),
    };
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    const mathPoint = readFocusedMathPoint(
      editorRoot,
      document
    );

    if (mathPoint) {
      return {
        anchor: mathPoint,
        focus: mathPoint,
        collapsed: true,
        isFullDocument: false,
        insertPosition: pointToInsertPosition(
          mathPoint,
          null,
          true,
          document,
          editorRoot,
          false
        ),
      };
    }

    const textPoint = readFocusedTextPoint(
      editorRoot,
      document
    );

    if (!textPoint) {
      return null;
    }

    return {
      anchor: textPoint,
      focus: textPoint,
      collapsed: true,
      isFullDocument: false,
      insertPosition: pointToInsertPosition(
        textPoint,
        null,
        true,
        document,
        editorRoot,
        false
      ),
    };
  }

  const range = selection.getRangeAt(0);

  if (!selectionTouchesEditor(editorRoot, range)) {
    return null;
  }

  let anchor = resolvePointFromDom(
    selection.anchorNode!,
    selection.anchorOffset,
    editorRoot,
    document
  );
  let focus = resolvePointFromDom(
    selection.focusNode!,
    selection.focusOffset,
    editorRoot,
    document
  );

  if (!anchor) {
    anchor = readFocusedMathPoint(editorRoot, document);
  }

  if (!focus) {
    focus = anchor;
  }

  if (!anchor || !focus) {
    return null;
  }

  const domStoredRange = readEditorRangeSelection(editorRoot);
  const domCollapsed =
    selection.isCollapsed ||
    (anchor.paragraphId === focus.paragraphId &&
      anchor.nodeId === focus.nodeId &&
      anchor.offset === focus.offset &&
      anchor.kind === focus.kind);
  const sameTextNodeSelection =
    !domCollapsed &&
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.kind === "text" &&
    focus.kind === "text";

  if (
    domStoredRange &&
    !isEditorRangeSelectionCollapsed(domStoredRange) &&
    (domCollapsed || !sameTextNodeSelection)
  ) {
    anchor = domStoredRange.anchor;
    focus = domStoredRange.focus;
  } else if (sameTextNodeSelection) {
    clearEditorRangeSelection(editorRoot);
  } else if (
    domStoredRange &&
    isEditorRangeSelectionCollapsed(domStoredRange)
  ) {
    clearEditorRangeSelection(editorRoot);
  }

  const collapsed =
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.offset === focus.offset &&
    anchor.kind === focus.kind;

  const ordered =
    comparePoints(anchor, focus, document) <= 0
      ? { start: anchor, end: focus }
      : { start: focus, end: anchor };

  const isFullDocument =
    !collapsed &&
    (isFullDocumentRange(editorRoot, range) ||
      isFullDocumentPoints(
        document,
        editorRoot,
        ordered.start,
        ordered.end
      ));

  return {
    anchor,
    focus,
    collapsed,
    isFullDocument,
    insertPosition: pointToInsertPosition(
      ordered.start,
      collapsed ? null : ordered.end,
      collapsed,
      document,
      editorRoot,
      isFullDocument
    ),
  };
}

function getDefaultInsertPosition(
  document: EditorDocument,
  editorRoot: HTMLElement
): ResolvedInsertPosition | null {
  // Prefer the last paragraph — more natural when inserting from dialogs.
  for (let i = document.paragraphs.length - 1; i >= 0; i--) {
    const paragraph = document.paragraphs[i];
    if (!paragraph) {
      continue;
    }

    for (let j = paragraph.children.length - 1; j >= 0; j--) {
      const textNode = paragraph.children[j];
      if (!textNode || textNode.type !== "text") {
        continue;
      }

      const liveText =
        readLiveTextFromNode(editorRoot, paragraph.id, textNode.id) ??
        textNode.text;

      return {
        paragraphId: paragraph.id,
        nodeId: textNode.id,
        offset: liveText.length,
        liveText,
      };
    }
  }

  return null;
}

/**
 * Single entry point for resolving where inline math should be inserted.
 */
export function resolveEditorInsertPosition(
  document: EditorDocument,
  editorRoot: HTMLElement,
  storedCursor: CursorPosition | null,
  sessionOverride?: SessionSelectionOverride | null
): ResolvedInsertPosition | null {
  const fromDom = readEditorSelection(
    document,
    editorRoot,
    sessionOverride
  );

  if (fromDom?.insertPosition) {
    return fromDom.insertPosition;
  }

  if (storedCursor) {
    const fromStored = resolveInsertPositionFromStoredCursor(
      document,
      editorRoot,
      storedCursor
    );

    if (fromStored) {
      return fromStored;
    }
  }

  return getDefaultInsertPosition(document, editorRoot);
}

export function syncEditorSelectionVisual(
  editorRoot: HTMLElement,
  state: EditorSelectionState | null
): void {
  if (state?.isFullDocument) {
    editorRoot.setAttribute(SELECT_ALL_ATTR, SELECT_ALL_VALUE);
  }
}

/**
 * Select the full inline document (text + math) in document order.
 */
export function selectAllEditorContent(
  editorRoot: HTMLElement,
  _document?: EditorDocument
): boolean {
  const inlineNodes = getInlineNodes(editorRoot);

  if (inlineNodes.length === 0) {
    return false;
  }

  const selection = window.getSelection();

  if (selection) {
    const first = inlineNodes[0];
    const last = inlineNodes[inlineNodes.length - 1];
    const range = window.document.createRange();

    try {
      range.setStartBefore(first);
      range.setEndAfter(last);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // Browsers may refuse cross-contenteditable ranges.
    }

    if (selection.isCollapsed) {
      const active = window.document.activeElement;

      if (
        active instanceof HTMLElement &&
        active.isContentEditable &&
        editorRoot.contains(active)
      ) {
        try {
          const fallback = window.document.createRange();
          fallback.selectNodeContents(active);
          selection.removeAllRanges();
          selection.addRange(fallback);
        } catch {
          // Visual select-all still applies below.
        }
      }
    }
  }

  editorRoot.setAttribute(SELECT_ALL_ATTR, SELECT_ALL_VALUE);
  clearEditorRangeSelection(editorRoot);
  return true;
}

export function clearEditorSelectAllVisual(
  editorRoot: HTMLElement
): void {
  editorRoot.removeAttribute(SELECT_ALL_ATTR);
}

const CARET_RESTORE_ATTR = "data-caret-restore";

export function setEditorCaretRestoreHint(
  editorRoot: HTMLElement,
  hint: {
    nodeId: string;
    offset: number;
  } | null
): void {
  if (!hint) {
    editorRoot.removeAttribute(CARET_RESTORE_ATTR);
    return;
  }

  editorRoot.setAttribute(
    CARET_RESTORE_ATTR,
    `${hint.nodeId}:${hint.offset}`
  );
}

export function readEditorCaretRestoreHint(
  element: HTMLElement
): { nodeId: string; offset: number } | null {
  const surface = element.closest(".edunga-editor-surface");

  if (!(surface instanceof HTMLElement)) {
    return null;
  }

  const raw = surface.getAttribute(CARET_RESTORE_ATTR);

  if (!raw) {
    return null;
  }

  const separator = raw.indexOf(":");

  if (separator === -1) {
    return null;
  }

  const nodeId = raw.slice(0, separator);
  const offset = Number.parseInt(
    raw.slice(separator + 1),
    10
  );

  if (!nodeId || Number.isNaN(offset)) {
    return null;
  }

  return { nodeId, offset };
}
