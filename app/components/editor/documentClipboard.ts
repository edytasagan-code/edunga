import { parseEditorDocument } from "./parseEditorDocument";
import {
  createTextNode,
  ensureDocumentInlineEditing,
  generateId,
} from "./core/document";
import { syncParagraphLiveText, mapOffsetToTextNode, computeParagraphStreamOffset } from "./resolveCaretAfterMathRemoval";
import {
  deleteDocumentRange,
  documentToPlainText,
  extractDocumentRange,
  insertDocumentFragment,
  replaceDocumentContent,
} from "./documentRange";
import type { CursorPosition } from "./core/cursor";
import type {
  DocumentPoint,
  EditorSelectionState,
  SessionSelectionOverride,
} from "./selectionModel";
import {
  isEditorSelectAllActive,
  readEditorSelection,
  resolveEditorInsertPosition,
} from "./selectionModel";
import { resolveInsertPositionFromStoredCursor } from "./selection";
import type { EditorDocument, InlineNode } from "./types";

export const EDUNGA_CLIPBOARD_MIME =
  "application/x-edunga-editor+json";

export function serializeDocumentForClipboard(
  document: EditorDocument
): string {
  return JSON.stringify(document);
}

export function parseClipboardDocument(
  value: string
): EditorDocument | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parseEditorDocument(parsed);
  } catch {
    return null;
  }
}

export function buildClipboardPayload(
  fragment: EditorDocument
): {
  json: string;
  plain: string;
} {
  return {
    json: serializeDocumentForClipboard(fragment),
    plain: documentToPlainText(fragment),
  };
}

function readMathLatexFromDom(
  editorRoot: HTMLElement,
  nodeId: string
): string | null {
  const field = editorRoot.querySelector(
    `[data-node-id="${nodeId}"] math-field`
  ) as { getValue?: (format: string) => string } | null;

  if (!field || typeof field.getValue !== "function") {
    return null;
  }

  return field.getValue("latex");
}

/**
 * Flushes live text and math-field values from the DOM into a document snapshot
 * before clipboard serialization.
 */
export function syncDocumentFromDom(
  document: EditorDocument,
  editorRoot: HTMLElement
): EditorDocument {
  const paragraphs = document.paragraphs.map((paragraph) => {
    const syncedChildren = syncParagraphLiveText(
      paragraph.id,
      paragraph.children,
      editorRoot
    );

    const children = syncedChildren.map((node) => {
      if (node.type !== "math") {
        return node;
      }

      const liveLatex = readMathLatexFromDom(
        editorRoot,
        node.id
      );

      if (
        liveLatex === null ||
        liveLatex === node.latex
      ) {
        return node;
      }

      return {
        ...node,
        latex: liveLatex,
      };
    });

    return {
      ...paragraph,
      children,
    };
  });

  return {
    ...document,
    paragraphs,
  };
}

export function extractSelectionFragment(
  document: EditorDocument,
  selection: EditorSelectionState,
  editorRoot: HTMLElement
): EditorDocument | null {
  if (selection.isFullDocument) {
    return structuredClone(document);
  }

  if (selection.collapsed) {
    return null;
  }

  return extractDocumentRange(
    document,
    selection.anchor,
    selection.focus,
    editorRoot
  );
}

function isCollapsedSessionSelection(
  selection: SessionSelectionOverride
): boolean {
  const { anchor, focus } = selection;

  return (
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.kind === focus.kind &&
    anchor.offset === focus.offset
  );
}

function readMathLatexFromWrapper(
  mathWrapper: Element
): string {
  const field = mathWrapper.querySelector(
    "math-field"
  ) as { getValue?: (format: string) => string } | null;

  if (!field || typeof field.getValue !== "function") {
    return "";
  }

  return field.getValue("latex");
}

/**
 * Builds a clipboard fragment from visible inline nodes in DOM order.
 * Used for select-all copy so the fragment always matches what the user sees.
 */
export function extractFullDocumentFromDom(
  editorRoot: HTMLElement,
  version: EditorDocument["version"]
): EditorDocument {
  const children: InlineNode[] = [];

  for (const element of editorRoot.querySelectorAll(
    '[data-node-type="text"], [data-node-type="math"]'
  )) {
    const nodeType = element.getAttribute("data-node-type");

    if (nodeType === "text") {
      const text = element.textContent ?? "";

      if (text) {
        children.push(createTextNode(text));
      }

      continue;
    }

    if (nodeType === "math") {
      children.push({
        id: generateId(),
        type: "math",
        latex: readMathLatexFromWrapper(element),
      });
    }
  }

  if (children.length === 0) {
    children.push(createTextNode(""));
  }

  return ensureDocumentInlineEditing({
    version,
    paragraphs: [
      {
        id: generateId(),
        children,
      },
    ],
  });
}

export function extractEditorClipboardFragment(
  document: EditorDocument,
  editorRoot: HTMLElement,
  sessionSelection: SessionSelectionOverride | null,
  options?: {
    treatAsFullDocument?: boolean;
  }
): EditorDocument | null {
  if (
    options?.treatAsFullDocument ||
    sessionSelection?.isFullDocument ||
    isEditorSelectAllActive(editorRoot)
  ) {
    return extractFullDocumentFromDom(
      editorRoot,
      document.version
    );
  }

  const syncedDocument = syncDocumentFromDom(
    document,
    editorRoot
  );

  if (
    sessionSelection &&
    !isCollapsedSessionSelection(sessionSelection)
  ) {
    return extractDocumentRange(
      syncedDocument,
      sessionSelection.anchor,
      sessionSelection.focus,
      editorRoot
    );
  }

  const state = readEditorSelection(
    syncedDocument,
    editorRoot,
    sessionSelection
  );

  if (!state) {
    return null;
  }

  return extractSelectionFragment(
    syncedDocument,
    state,
    editorRoot
  );
}

export function resolvePasteSelectionState(
  document: EditorDocument,
  editorRoot: HTMLElement,
  sessionSelection: SessionSelectionOverride | null,
  storedCursor: CursorPosition | null
): EditorSelectionState | null {
  const syncedDocument = syncDocumentFromDom(
    document,
    editorRoot
  );

  if (storedCursor && !sessionSelection?.isFullDocument) {
    const fromStored = resolveInsertPositionFromStoredCursor(
      syncedDocument,
      editorRoot,
      storedCursor
    );

    if (fromStored) {
      const domState = readEditorSelection(
        syncedDocument,
        editorRoot,
        sessionSelection
      );

      if (
        domState &&
        !domState.collapsed &&
        !domState.isFullDocument
      ) {
        return domState;
      }

      const point = {
        paragraphId: fromStored.paragraphId,
        nodeId: fromStored.nodeId,
        kind: "text" as const,
        offset: fromStored.offset,
      };

      return {
        anchor: point,
        focus: point,
        collapsed: true,
        isFullDocument: false,
        insertPosition: fromStored,
      };
    }
  }

  const state = readEditorSelection(
    syncedDocument,
    editorRoot,
    sessionSelection
  );

  if (state) {
    return state;
  }

  const insertPosition = resolveEditorInsertPosition(
    syncedDocument,
    editorRoot,
    storedCursor,
    sessionSelection
  );

  if (!insertPosition) {
    return null;
  }

  const point = {
    paragraphId: insertPosition.paragraphId,
    nodeId: insertPosition.nodeId,
    kind: "text" as const,
    offset: insertPosition.offset,
  };

  return {
    anchor: point,
    focus: point,
    collapsed: true,
    isFullDocument: false,
    insertPosition,
  };
}

export type PasteResult = {
  document: EditorDocument;
  focus?: {
    paragraphId: string;
    nodeId: string;
    offset: number;
  };
};

export function applyClipboardFragment(
  document: EditorDocument,
  selection: EditorSelectionState,
  fragment: EditorDocument,
  editorRoot: HTMLElement
): PasteResult {
  if (
    !selection.collapsed &&
    selection.isFullDocument
  ) {
    return {
      document: replaceDocumentContent(document, fragment),
      focus: findFirstTextPointForPaste(
        replaceDocumentContent(document, fragment)
      ),
    };
  }

  let working = document;

  if (!selection.collapsed) {
    working = deleteDocumentRange(
      working,
      selection.anchor,
      selection.focus,
      editorRoot
    );
  }

  const insertPosition = selection.insertPosition;

  if (!insertPosition) {
    if (isEffectivelyEmptyDocument(working, editorRoot)) {
      const next = replaceDocumentContent(working, fragment);

      return {
        document: next,
        focus: findFirstTextPointForPaste(next),
      };
    }

    return { document: working };
  }

  const next = insertDocumentFragment(
    working,
    insertPosition.paragraphId,
    insertPosition.nodeId,
    insertPosition.offset,
    fragment
  );

  const focus = resolveFocusAfterFragmentInsert(
    working,
    insertPosition,
    fragment,
    next,
    editorRoot
  );

  return {
    document: next,
    focus,
  };
}

function fragmentTextLength(fragment: EditorDocument): number {
  return fragment.paragraphs
    .flatMap((paragraph) => paragraph.children)
    .reduce((total, node) => {
      if (node.type === "text") {
        return total + node.text.length;
      }

      return total;
    }, 0);
}

function resolveFocusAfterFragmentInsert(
  sourceDocument: EditorDocument,
  insertPosition: NonNullable<EditorSelectionState["insertPosition"]>,
  fragment: EditorDocument,
  resultDocument: EditorDocument,
  editorRoot: HTMLElement
): PasteResult["focus"] {
  const fragmentNodes = fragment.paragraphs.flatMap(
    (paragraph) => paragraph.children
  );
  const lastFragmentNode =
    fragmentNodes[fragmentNodes.length - 1];

  const streamAtInsert = computeParagraphStreamOffset(
    sourceDocument,
    {
      paragraphId: insertPosition.paragraphId,
      nodeId: insertPosition.nodeId,
      kind: "text",
      offset: insertPosition.offset,
    },
    editorRoot
  );

  const resultParagraph = resultDocument.paragraphs.find(
    (paragraph) => paragraph.id === insertPosition.paragraphId
  );

  if (!resultParagraph) {
    return findFirstTextPointForPaste(resultDocument);
  }

  if (lastFragmentNode?.type === "math") {
    const mathNodes = resultParagraph.children.filter(
      (node) => node.type === "math"
    );
    const fragmentMathCount = fragmentNodes.filter(
      (node) => node.type === "math"
    ).length;
    const targetMath = mathNodes[mathNodes.length - fragmentMathCount];

    if (targetMath?.type === "math") {
      const followingText = resultParagraph.children[
        resultParagraph.children.findIndex(
          (node) => node.id === targetMath.id
        ) + 1
      ];

      if (followingText?.type === "text") {
        return {
          paragraphId: insertPosition.paragraphId,
          nodeId: followingText.id,
          offset: 0,
        };
      }

      return {
        paragraphId: insertPosition.paragraphId,
        nodeId: targetMath.id,
        offset: 1,
      };
    }
  }

  const targetStream =
    (streamAtInsert?.offset ?? insertPosition.offset) +
    fragmentTextLength(fragment);
  const mapped = mapOffsetToTextNode(
    resultParagraph.children,
    targetStream
  );

  if (mapped) {
    return {
      paragraphId: insertPosition.paragraphId,
      nodeId: mapped.nodeId,
      offset: mapped.offset,
    };
  }

  return findFirstTextPointForPaste(resultDocument);
}

function findFirstTextPoint(
  document: EditorDocument
): PasteResult["focus"] {
  return findFirstTextPointForPaste(document);
}

export function findFirstTextPointForPaste(
  document: EditorDocument
): PasteResult["focus"] {
  for (const paragraph of document.paragraphs) {
    for (const node of paragraph.children) {
      if (node.type === "text") {
        return {
          paragraphId: paragraph.id,
          nodeId: node.id,
          offset: 0,
        };
      }
    }
  }

  return undefined;
}

export function isEffectivelyEmptyDocument(
  document: EditorDocument,
  editorRoot: HTMLElement
): boolean {
  if (editorRoot.querySelector('[data-node-type="math"]')) {
    return false;
  }

  const visibleText = editorRoot.textContent ?? "";

  if (visibleText.trim().length > 0) {
    return false;
  }

  return document.paragraphs.every((paragraph) =>
    paragraph.children.every(
      (node) => node.type === "text" && !node.text
    )
  );
}

function findInlineWrapperFromHit(
  hit: Element,
  editorRoot: HTMLElement
): HTMLElement | null {
  let current: Element | null = hit;

  while (current) {
    if (
      current instanceof HTMLElement &&
      current.matches(
        '[data-node-type="text"], [data-node-type="math"]'
      ) &&
      editorRoot.contains(current)
    ) {
      return current;
    }

    if (
      current instanceof HTMLElement &&
      current.matches("math-field")
    ) {
      const mathWrapper = current.closest(
        '[data-node-type="math"]'
      );

      if (
        mathWrapper instanceof HTMLElement &&
        editorRoot.contains(mathWrapper)
      ) {
        return mathWrapper;
      }
    }

    const root = current.getRootNode();

    if (root instanceof ShadowRoot) {
      current = root.host;
      continue;
    }

    current = current.parentElement;
  }

  return null;
}

function hitIsInsideEditor(
  hit: Element,
  editorRoot: HTMLElement
): boolean {
  return Boolean(
    findInlineWrapperFromHit(hit, editorRoot)
  );
}

export function resolvePointFromPointer(
  clientX: number,
  clientY: number,
  editorRoot: HTMLElement,
  document: EditorDocument
): DocumentPoint | null {
  const hit = window.document.elementFromPoint(
    clientX,
    clientY
  );

  if (!hit || !hitIsInsideEditor(hit, editorRoot)) {
    return null;
  }

  const inlineWrapper = findInlineWrapperFromHit(
    hit,
    editorRoot
  );

  if (
    inlineWrapper?.getAttribute("data-node-type") === "math" &&
    editorRoot.contains(inlineWrapper)
  ) {
    const mathWrapper = inlineWrapper;
    const paragraphId =
      mathWrapper
        .closest("[data-paragraph-id]")
        ?.getAttribute("data-paragraph-id") ?? null;
    const nodeId = mathWrapper.getAttribute("data-node-id");

    if (!paragraphId || !nodeId) {
      return null;
    }

    return {
      paragraphId,
      nodeId,
      kind: "math",
      offset: 0,
    };
  }

  const textWrapper =
    inlineWrapper?.getAttribute("data-node-type") === "text"
      ? inlineWrapper
      : null;

  if (
    textWrapper instanceof HTMLElement &&
    editorRoot.contains(textWrapper)
  ) {
    const paragraphId =
      textWrapper
        .closest("[data-paragraph-id]")
        ?.getAttribute("data-paragraph-id") ?? null;
    const nodeId = textWrapper.getAttribute("data-node-id");

    if (!paragraphId || !nodeId) {
      return null;
    }

    const paragraph = document.paragraphs.find(
      (item) => item.id === paragraphId
    );
    const node = paragraph?.children.find(
      (item) => item.id === nodeId
    );

    if (node?.type !== "text") {
      return null;
    }

    const caret =
      window.document.caretPositionFromPoint?.(
        clientX,
        clientY
      ) ??
      (() => {
        const range =
          window.document.caretRangeFromPoint?.(
            clientX,
            clientY
          );

        if (!range) {
          return null;
        }

        return {
          offsetNode: range.startContainer,
          offset: range.startOffset,
        };
      })();

    if (!caret || !textWrapper.contains(caret.offsetNode)) {
      return {
        paragraphId,
        nodeId,
        kind: "text",
        offset: 0,
      };
    }

    const range = window.document.createRange();

    try {
      range.setStart(
        caret.offsetNode,
        caret.offset
      );
      range.collapse(true);
    } catch {
      return {
        paragraphId,
        nodeId,
        kind: "text",
        offset: 0,
      };
    }

    const textChild = textWrapper.firstChild;
    let offset = 0;

    if (textChild?.nodeType === Node.TEXT_NODE) {
      if (range.startContainer === textChild) {
        offset = range.startOffset;
      } else {
        const pre = window.document.createRange();
        pre.setStart(textChild, 0);
        pre.setEnd(
          range.startContainer,
          range.startOffset
        );
        offset = pre.toString().length;
      }
    }

    const liveText = textWrapper.textContent ?? node.text;

    return {
      paragraphId,
      nodeId,
      kind: "text",
      offset: Math.max(
        0,
        Math.min(offset, liveText.length)
      ),
    };
  }

  return null;
}
