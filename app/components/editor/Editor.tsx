"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

import dynamic from "next/dynamic";
import Toolbar from "./Toolbar";
const ConvertInkToMathDialog = dynamic(() => import("./ConvertInkToMathDialog"), {
  ssr: false,
});
import "./styles.css";
import "./editor-split-layout.css";
import {
  ensureEditorShortcutHandlers,
  setActiveEditorShortcutTarget,
  setActiveEditorSurface,
} from "./activeSurface";
import Cursor from "./core/cursor";
import HistoryManager from "./core/history";
import {
  focusMathField,
  insertMathTemplate,
  resolveActiveField,
} from "./commands";
import {
  applyClipboardFragment,
  extractEditorClipboardFragment,
  findFirstTextPointForPaste,
  isEffectivelyEmptyDocument,
  resolvePasteSelectionState,
  syncDocumentFromDom,
} from "./documentClipboard";
import { replaceDocumentContent } from "./documentRange";
import {
  deleteDocumentRange,
  getNodeIdsInRange,
} from "./documentRange";
import {
  type DocumentSelection,
  type EditorSessionController,
  armFullDocumentClipboard,
  disarmFullDocumentClipboard,
  isFullDocumentClipboardArmed,
  markEditorSurfaceActive,
  markEditorSurfaceSelection,
  registerEditorSessionController,
  unregisterEditorSessionController,
} from "./editorSession";
import type { MathTemplateKey } from "./mathTemplates";
import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
  ensureDocumentImageEditing,
} from "./core/document";
import insertMath from "./core/operations/insertMath";
import insertImage from "./core/operations/insertImage";
import insertInk from "./core/operations/insertInk";
import updateImage from "./core/operations/updateImage";
import {
  DEFAULT_INK_HEIGHT,
  DEFAULT_INK_WIDTH,
  DEFAULT_INK_STROKE_COLOR,
  scaleInkStrokes,
} from "./core/inkStrokeUtils";
import updateInk from "./core/operations/updateInk";
import moveImage from "./core/operations/moveImage";
import moveInk from "./core/operations/moveInk";
import moveParagraph, {
  moveParagraphsByIndex,
} from "./core/operations/moveParagraph";
import duplicateParagraph, {
  duplicateParagraphs,
} from "./core/operations/duplicateParagraph";
import clearEditorContent from "./core/operations/clearContent";
import removeNode from "./core/operations/removeNode";
import updateText from "./core/operations/updateText";
import updateMath from "./core/operations/updateMath";
import {
  updateTrueFalseTableMath,
  updateTrueFalseTableText,
} from "./core/operations/updateTrueFalseTable";
import { focusInlineTextNode } from "./focusInlineText";
import { focusInlineMathNode } from "./focusInlineMath";
import DocumentRenderer from "./render/DocumentRenderer";
import {
  resolveCaretAfterMathRemoval,
  resolveCaretAfterRangeDelete,
  resolveCaretFromCursorPosition,
  syncParagraphLiveText,
  type CaretRestoreTarget,
} from "./resolveCaretAfterMathRemoval";
import { scheduleCaretRestore } from "./scheduleCaretRestore";
import {
  measureTextOffset,
  readLiveTextFromNode,
  resolveFocusedEditorSurface,
} from "./selection";
import {
  clearEditorSelectAllVisual,
  getDocumentEndpoints,
  readEditorSelection,
  resolveEditorInsertPosition,
  setEditorCaretRestoreHint,
  shouldDeleteEntireEditor,
  type DocumentPoint,
  type ResolvedInsertPosition,
} from "./selectionModel";
import { resolvePointFromPointer } from "./documentClipboard";
import {
  extractClipboardImageFile,
  readImageFileAsDataUrl,
  type ImageFileData,
} from "./imageFiles";
import { EditorDocument, ImageAlign, type InkStroke } from "./types";
import JumpToBlockDialog from "./JumpToBlockDialog";
import {
  createEmptyParagraphSelection,
  extendParagraphSelection,
  getPrimarySelectedParagraphId,
  getSelectedParagraphIdsInOrder,
  resolveParagraphClickSelection,
  type ParagraphSelectionState,
} from "./paragraphSelection";

export type EditorLayout = "default" | "primary" | "compact" | "secondary";

export type EditorMode = "select" | "pen" | "eraser";

export type EditorToolbarTarget = {
  editorRoot: RefObject<HTMLDivElement | null>;
  onInsertMath: () => Promise<string | null>;
  onInsertMathTemplate: (
    template: MathTemplateKey
  ) => Promise<void>;
  onInsertImage: () => void;
  onReplaceImage?: () => void;
  onAlignImage?: (align: ImageAlign) => void;
  hasSelectedImage?: () => boolean;
  getSelectedImageAlign?: () => ImageAlign;
  getEditorMode?: () => EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  getInkColor?: () => string;
  onInkColorChange?: (color: string) => void;
  onInsertInk?: () => string | null;
  onAlignInk?: (align: ImageAlign) => void;
  hasSelectedInk?: () => boolean;
  getSelectedInkAlign?: () => ImageAlign;
  onConvertInkToMath?: () => void;
  onDeleteEntireContent: () => void;
  ensureMathFocus: () => Promise<void>;
  scrollToParagraph?: (paragraphId: string) => void;
  duplicateBlocks?: () => void;
  moveBlocksUp?: () => void;
  moveBlocksDown?: () => void;
  toggleOutline?: () => void;
  getOutlineVisible?: () => boolean;
  hasBlockSelection?: () => boolean;
};

export type EditorHandle = EditorToolbarTarget & {
  /** Flush live DOM text/math into the document model and notify onChange. */
  commitDocument: () => EditorDocument;
  scrollToParagraph: (paragraphId: string) => void;
  duplicateBlocks: () => void;
  moveBlocksUp: () => void;
  moveBlocksDown: () => void;
  toggleOutline: () => void;
  getOutlineVisible: () => boolean;
  hasBlockSelection: () => boolean;
  onReplaceImage: () => void;
  onAlignImage: (align: ImageAlign) => void;
  hasSelectedImage: () => boolean;
  getSelectedImageAlign: () => ImageAlign;
  getEditorMode: () => EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  getInkColor: () => string;
  onInkColorChange: (color: string) => void;
  onInsertInk: () => string | null;
  onAlignInk: (align: ImageAlign) => void;
  hasSelectedInk: () => boolean;
  getSelectedInkAlign: () => ImageAlign;
  onConvertInkToMath: () => void;
};

type Props = {
  value?: EditorDocument;
  onChange?: (document: EditorDocument) => void;
  hideToolbar?: boolean;
  layout?: EditorLayout;
  sessionId: string;
  onActivate?: (target: EditorToolbarTarget) => void;
  className?: string;
  showOutline?: boolean;
  onOutlineChange?: (visible: boolean) => void;
  onScrollToParagraph?: (paragraphId: string) => void;
  /** Focus this math node on mount / when the id changes (e.g. answer field). */
  defaultFocusMathNodeId?: string | null;
};

const layoutShellClass: Record<EditorLayout, string> = {
  default: "",
  primary:
    "edunga-editor--primary flex min-h-0 flex-1 flex-col",
  compact: "edunga-editor--compact flex h-full min-h-0 flex-col",
  secondary:
    "edunga-editor--secondary flex min-h-0 flex-1 flex-col",
};

const layoutSurfaceClass: Record<EditorLayout, string> = {
  default: "min-h-[260px]",
  primary: "min-h-0 flex-1 overflow-y-auto",
  compact: "min-h-0 h-full overflow-y-auto px-4 py-2",
  secondary: "min-h-0 flex-1 overflow-y-auto",
};

const Editor = forwardRef<EditorHandle, Props>(function Editor(
  {
    value,
    onChange,
    hideToolbar = false,
    layout = "default",
    sessionId,
    onActivate,
    className = "",
    showOutline = false,
    onOutlineChange,
    onScrollToParagraph,
    defaultFocusMathNodeId = null,
  },
  ref
) {
  const cursor = useRef(new Cursor());
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(new HistoryManager());
  const isApplyingHistoryRef = useRef(false);
  const historyReadyRef = useRef(false);
  const documentRef = useRef<EditorDocument>(
    createEmptyDocument("editor")
  );

  const [internalDocument, setInternalDocument] =
    useState<EditorDocument>(() =>
      createEmptyDocument("editor")
    );

  const document = value ?? internalDocument;

  documentRef.current = document;

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<{
    paragraphId: string;
    nodeId: string;
  } | null>(null);

  const [selectedInk, setSelectedInk] = useState<{
    paragraphId: string;
    nodeId: string;
  } | null>(null);
  const [selectedInkStrokeIndices, setSelectedInkStrokeIndices] = useState<
    number[]
  >([]);
  const [inkMathDialogOpen, setInkMathDialogOpen] = useState(false);

  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [inkColor, setInkColor] = useState(DEFAULT_INK_STROKE_COLOR);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputModeRef = useRef<"insert" | "replace">("insert");

  const draggingImageRef = useRef<{
    paragraphId: string;
    nodeId: string;
    active: boolean;
    moved: boolean;
  } | null>(null);

  const draggingInkRef = useRef<{
    paragraphId: string;
    nodeId: string;
    active: boolean;
    moved: boolean;
  } | null>(null);

  const [dragOverEditor, setDragOverEditor] = useState(false);

  const [paragraphSelection, setParagraphSelection] =
    useState<ParagraphSelectionState>(() =>
      createEmptyParagraphSelection()
    );
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(showOutline);
  const draggingParagraphIdsRef = useRef<string[]>([]);
  const [dragOverParagraphId, setDragOverParagraphId] = useState<
    string | null
  >(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    "before" | "after" | null
  >(null);

  const [rangeHighlightIds, setRangeHighlightIds] =
    useState<ReadonlySet<string>>(() => new Set());

  const sessionSelectionRef =
    useRef<DocumentSelection | null>(null);

  const armedForCopyRef = useRef(false);

  const sessionControllerRef =
    useRef<EditorSessionController | null>(null);

  const dragSelectionRef = useRef<{
    anchor: DocumentPoint | null;
    active: boolean;
    moved: boolean;
  }>({ anchor: null, active: false, moved: false });

  const [autoFocusMathId, setAutoFocusMathId] =
    useState<string | null>(null);

  const pendingCaretRestoreRef =
    useRef<CaretRestoreTarget | null>(null);

  const suppressSelectionSyncRef = useRef(false);

  const normalizedOnce = useRef(false);

  const restoreCaret = useCallback(
    (target: CaretRestoreTarget | null, root?: HTMLElement | null) => {
      const editorRoot = root ?? editorAreaRef.current;

      if (!target || !editorRoot) {
        return;
      }

      suppressSelectionSyncRef.current = true;
      pendingCaretRestoreRef.current = target;

      if (target.kind === "text") {
        cursor.current.set({
          paragraphId: target.paragraphId,
          nodeId: target.nodeId,
          offset: target.offset,
        });
        setEditorCaretRestoreHint(editorRoot, {
          nodeId: target.nodeId,
          offset: target.offset,
        });
      }

      scheduleCaretRestore(target, editorRoot, () => {
        suppressSelectionSyncRef.current = false;
        pendingCaretRestoreRef.current = null;

        if (editorAreaRef.current) {
          setEditorCaretRestoreHint(
            editorAreaRef.current,
            null
          );
        }
      });
    },
    []
  );

  function recordHistoryBeforeChange() {
    if (isApplyingHistoryRef.current) {
      return;
    }

    historyRef.current.push(
      documentRef.current,
      cursor.current.get()
    );
  }

  function applyDocument(next: EditorDocument) {
    if (next === documentRef.current) {
      return;
    }

    if (value === undefined) {
      setInternalDocument(next);
    }

    onChange?.(next);
  }

  function update(next: EditorDocument) {
    applyDocument(
      ensureDocumentImageEditing(ensureDocumentInlineEditing(next))
    );
  }

  const commitDocument = useCallback((): EditorDocument => {
    const root = editorAreaRef.current;
    let next = documentRef.current;

    if (root?.isConnected) {
      next = syncDocumentFromDom(documentRef.current, root);
      documentRef.current = next;
    }

    if (value === undefined) {
      setInternalDocument(next);
    }

    onChange?.(next);
    return next;
  }, [onChange, value]);

  const scrollToParagraph = useCallback(
    (paragraphId: string) => {
      const root = editorAreaRef.current;
      const element = root?.querySelector(
        `[data-paragraph-id="${paragraphId}"]`
      );

      element?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });

      onScrollToParagraph?.(paragraphId);
    },
    [onScrollToParagraph]
  );

  const clearParagraphSelection = useCallback(() => {
    setParagraphSelection(createEmptyParagraphSelection());
  }, []);

  const handleToggleSection = useCallback((sectionId: string) => {
    setCollapsedSectionIds((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }, []);

  const handleDuplicateBlocks = useCallback(() => {
    const selectedIds = getSelectedParagraphIdsInOrder(
      documentRef.current,
      paragraphSelection
    );
    const primaryId = getPrimarySelectedParagraphId(paragraphSelection);

    if (selectedIds.length === 0 && !primaryId) {
      return;
    }

    recordHistoryBeforeChange();

    const next =
      selectedIds.length > 0
        ? duplicateParagraphs(documentRef.current, selectedIds)
        : duplicateParagraph(documentRef.current, primaryId!);

    update(next);
  }, [paragraphSelection]);

  const handleMoveBlocks = useCallback(
    (direction: -1 | 1) => {
      const selectedIds = getSelectedParagraphIdsInOrder(
        documentRef.current,
        paragraphSelection
      );

      if (selectedIds.length === 0) {
        const primaryId = getPrimarySelectedParagraphId(paragraphSelection);

        if (!primaryId) {
          return;
        }

        recordHistoryBeforeChange();
        update(
          moveParagraph(documentRef.current, primaryId, direction)
        );
        return;
      }

      const paragraphs = documentRef.current.paragraphs;
      const indices = selectedIds
        .map((id) => paragraphs.findIndex((item) => item.id === id))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b);

      if (indices.length === 0) {
        return;
      }

      const targetIndex =
        direction === -1 ? indices[0] - 1 : indices[indices.length - 1] + 1;

      if (targetIndex < 0 || targetIndex >= paragraphs.length) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        moveParagraphsByIndex(
          documentRef.current,
          selectedIds,
          direction === -1 ? targetIndex : targetIndex - selectedIds.length + 1
        )
      );
    },
    [paragraphSelection]
  );

  const handleParagraphDragStart = useCallback(
    (paragraphId: string) => {
      const selectedIds = getSelectedParagraphIdsInOrder(
        documentRef.current,
        paragraphSelection
      );

      draggingParagraphIdsRef.current = selectedIds.includes(paragraphId)
        ? selectedIds
        : [paragraphId];
    },
    [paragraphSelection]
  );

  const handleParagraphDrop = useCallback(
    (targetParagraphId: string) => {
      const movingIds = draggingParagraphIdsRef.current;
      draggingParagraphIdsRef.current = [];
      setDragOverParagraphId(null);
      setDragOverPosition(null);

      if (movingIds.length === 0) {
        return;
      }

      const paragraphs = documentRef.current.paragraphs;
      let targetIndex = paragraphs.findIndex(
        (paragraph) => paragraph.id === targetParagraphId
      );

      if (targetIndex === -1) {
        return;
      }

      if (dragOverPosition === "after") {
        targetIndex += 1;
      }

      const movingSet = new Set(movingIds);
      const movingIndices = movingIds
        .map((id) => paragraphs.findIndex((paragraph) => paragraph.id === id))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b);

      if (movingIndices.length === 0) {
        return;
      }

      const minMoving = movingIndices[0];
      const maxMoving = movingIndices[movingIndices.length - 1];

      if (
        movingIds.length === 1 &&
        (targetIndex === minMoving || targetIndex === minMoving + 1)
      ) {
        return;
      }

      if (targetIndex > minMoving && targetIndex <= maxMoving + 1) {
        return;
      }

      const adjustedTarget =
        targetIndex > maxMoving
          ? targetIndex - movingSet.size
          : targetIndex;

      recordHistoryBeforeChange();
      update(
        moveParagraphsByIndex(
          documentRef.current,
          movingIds,
          Math.max(0, adjustedTarget)
        )
      );
      setParagraphSelection({
        selectedIds: new Set(movingIds),
        anchorId: movingIds[0] ?? null,
      });
    },
    [dragOverPosition]
  );

  const handleToggleOutline = useCallback(() => {
    setOutlineVisible((current) => {
      const next = !current;
      onOutlineChange?.(next);
      return next;
    });
  }, [onOutlineChange]);

  useEffect(() => {
    setOutlineVisible(showOutline);
  }, [showOutline]);

  const undo = useCallback(() => {
    const current = documentRef.current;
    const step = historyRef.current.undo(
      current,
      cursor.current.get()
    );

    if (!step) {
      return;
    }

    isApplyingHistoryRef.current = true;

    if (step.cursor) {
      cursor.current.set(step.cursor);
    }

    applyDocument(step.document);

    const root = editorAreaRef.current;

    if (root && step.cursor) {
      restoreCaret(
        resolveCaretFromCursorPosition(
          step.cursor,
          step.document
        ),
        root
      );
    }

    requestAnimationFrame(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [restoreCaret, onChange, value]);

  const redo = useCallback(() => {
    const current = documentRef.current;
    const step = historyRef.current.redo(
      current,
      cursor.current.get()
    );

    if (!step) {
      return;
    }

    isApplyingHistoryRef.current = true;

    if (step.cursor) {
      cursor.current.set(step.cursor);
    }

    applyDocument(step.document);

    const root = editorAreaRef.current;

    if (root && step.cursor) {
      restoreCaret(
        resolveCaretFromCursorPosition(
          step.cursor,
          step.document
        ),
        root
      );
    }

    requestAnimationFrame(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [restoreCaret, onChange, value]);

  const handleEditorKeyDownCapture = useCallback(
    (event: KeyboardEvent) => {
      const surface = editorAreaRef.current;

      if (!surface) {
        return;
      }

      if (resolveFocusedEditorSurface() !== surface) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasPrimaryModifier = event.ctrlKey || event.metaKey;

      if (hasPrimaryModifier && key === "g") {
        event.preventDefault();
        event.stopPropagation();
        setJumpDialogOpen(true);
        return;
      }

      if (hasPrimaryModifier && key === "d") {
        event.preventDefault();
        event.stopPropagation();
        handleDuplicateBlocks();
        return;
      }

      if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        event.stopPropagation();
        handleMoveBlocks(event.key === "ArrowUp" ? -1 : 1);
        return;
      }

      if (event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        event.stopPropagation();
        setParagraphSelection((current) =>
          extendParagraphSelection(
            documentRef.current,
            current,
            event.key === "ArrowUp" ? -1 : 1
          )
        );
        return;
      }

      if (!hasPrimaryModifier) {
        return;
      }

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        undo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    },
    [handleDuplicateBlocks, handleMoveBlocks, undo, redo]
  );

  const syncHighlightFromSession = useCallback(
    (selection: DocumentSelection | null) => {
      if (!selection) {
        setRangeHighlightIds(new Set());
        return;
      }

      if (selection.isFullDocument) {
        setRangeHighlightIds(
          new Set(
            documentRef.current.paragraphs.flatMap(
              (paragraph) =>
                paragraph.children.map((node) => node.id)
            )
          )
        );
        return;
      }

      const collapsed =
        selection.anchor.paragraphId ===
          selection.focus.paragraphId &&
        selection.anchor.nodeId ===
          selection.focus.nodeId &&
        selection.anchor.kind ===
          selection.focus.kind &&
        selection.anchor.offset ===
          selection.focus.offset;

      if (collapsed) {
        setRangeHighlightIds(new Set());
        return;
      }

      setRangeHighlightIds(
        getNodeIdsInRange(
          documentRef.current,
          selection.anchor,
          selection.focus
        )
      );
    },
    []
  );

  const clearSessionSelection = useCallback(() => {
    sessionSelectionRef.current = null;
    syncHighlightFromSession(null);

    const root = editorAreaRef.current;

    if (root) {
      clearEditorSelectAllVisual(root);
      markEditorSurfaceSelection(root, false);
    }
  }, [syncHighlightFromSession]);

  const handleParagraphSelect = useCallback(
    (
      paragraphId: string,
      modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
    ) => {
      setParagraphSelection((current) =>
        resolveParagraphClickSelection(
          documentRef.current,
          current,
          paragraphId,
          modifiers
        )
      );
      clearSessionSelection();
      setSelectedImage(null);
    },
    [clearSessionSelection]
  );

  const disarmCopySelection = useCallback(() => {
    armedForCopyRef.current = false;
    disarmFullDocumentClipboard(sessionId);
  }, [sessionId]);

  const setSessionSelection = useCallback(
    (
      anchor: DocumentPoint,
      focus: DocumentPoint,
      isFullDocument = false
    ) => {
      const collapsed =
        anchor.paragraphId === focus.paragraphId &&
        anchor.nodeId === focus.nodeId &&
        anchor.kind === focus.kind &&
        anchor.offset === focus.offset;

      if (collapsed && !isFullDocument) {
        clearSessionSelection();
        return;
      }

      const selection: DocumentSelection = {
        anchor,
        focus,
        isFullDocument,
      };

      sessionSelectionRef.current = selection;
      syncHighlightFromSession(selection);

      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      markEditorSurfaceSelection(root, true);

      if (isFullDocument) {
        armedForCopyRef.current = true;
        root.setAttribute("data-select-all", "true");
        armFullDocumentClipboard(sessionId, root);
      } else {
        armedForCopyRef.current = false;
        clearEditorSelectAllVisual(root);
        disarmFullDocumentClipboard(sessionId);
      }

      window.getSelection()?.removeAllRanges();
    },
    [clearSessionSelection, sessionId, syncHighlightFromSession]
  );

  const handleSelectAll = useCallback(() => {
    const surface = editorAreaRef.current;

    if (!surface) {
      return;
    }

    setActiveEditorSurface(surface);
    markEditorSurfaceActive(surface);

    const endpoints = getDocumentEndpoints(
      documentRef.current,
      surface
    );

    if (!endpoints) {
      return;
    }

    setSessionSelection(
      endpoints.first,
      endpoints.last,
      true
    );

    const state = readEditorSelection(
      documentRef.current,
      surface,
      sessionSelectionRef.current
    );

    if (state?.insertPosition) {
      cursor.current.set(state.insertPosition);
    }
  }, [setSessionSelection]);

  const handleDeleteEntireContent = useCallback(() => {
    const root = editorAreaRef.current;

    if (!root) {
      return;
    }

    recordHistoryBeforeChange();

    const cleared = clearEditorContent(documentRef.current);
    update(cleared);
    clearSessionSelection();
    disarmCopySelection();
    setSelectedNodeId(null);
    setAutoFocusMathId(null);

    const paragraph = cleared.paragraphs[0];
    const textNode = paragraph?.children.find(
      (node) => node.type === "text"
    );

    if (!paragraph || !textNode || textNode.type !== "text") {
      return;
    }

    cursor.current.set({
      paragraphId: paragraph.id,
      nodeId: textNode.id,
      offset: 0,
    });

    restoreCaret(
      {
        kind: "text",
        paragraphId: paragraph.id,
        nodeId: textNode.id,
        offset: 0,
      },
      root
    );
  }, [clearSessionSelection, restoreCaret]);

  sessionControllerRef.current = {
    getDocument: () => documentRef.current,
    getSelection: () => sessionSelectionRef.current,
    setSelection: setSessionSelection,
    selectAll: () => {
      handleSelectAll();
    },
    clearSelection: clearSessionSelection,
    copy: () => {
      const root = editorAreaRef.current;

      if (!root || !root.isConnected) {
        return null;
      }

      const treatAsFullDocument =
        armedForCopyRef.current ||
        isFullDocumentClipboardArmed(sessionId) ||
        root.getAttribute("data-select-all") === "true";

      return extractEditorClipboardFragment(
        documentRef.current,
        root,
        sessionSelectionRef.current,
        {
          treatAsFullDocument,
        }
      );
    },
    cut: () => {
      const root = editorAreaRef.current;

      if (!root) {
        return null;
      }

      const syncedDocument = syncDocumentFromDom(
        documentRef.current,
        root
      );

      const domSelection = readEditorSelection(
        syncedDocument,
        root,
        null
      );

      if (
        domSelection &&
        !domSelection.collapsed &&
        !domSelection.isFullDocument
      ) {
        const session = sessionSelectionRef.current;
        const hasSessionRange =
          session &&
          !(
            session.anchor.paragraphId ===
              session.focus.paragraphId &&
            session.anchor.nodeId === session.focus.nodeId &&
            session.anchor.kind === session.focus.kind &&
            session.anchor.offset === session.focus.offset
          );

        if (!hasSessionRange) {
          setSessionSelection(
            domSelection.anchor,
            domSelection.focus,
            false
          );
        }
      }

      const fragment = extractEditorClipboardFragment(
        documentRef.current,
        root,
        sessionSelectionRef.current,
        {
          treatAsFullDocument:
            armedForCopyRef.current ||
            isFullDocumentClipboardArmed(sessionId) ||
            root.getAttribute("data-select-all") === "true",
        }
      );

      if (!fragment) {
        return null;
      }

      const state = readEditorSelection(
        syncedDocument,
        root,
        sessionSelectionRef.current
      );

      const isFullDocument =
        sessionSelectionRef.current?.isFullDocument === true ||
        state?.isFullDocument === true ||
        root.getAttribute("data-select-all") === "true";

      recordHistoryBeforeChange();

      if (isFullDocument) {
        const cleared = clearEditorContent(
          documentRef.current
        );
        update(cleared);
        clearSessionSelection();
        disarmCopySelection();
        setSelectedNodeId(null);
        setAutoFocusMathId(null);

        const paragraph = cleared.paragraphs[0];
        const textNode = paragraph?.children.find(
          (node) => node.type === "text"
        );

        if (
          paragraph &&
          textNode &&
          textNode.type === "text"
        ) {
          restoreCaret(
            {
              kind: "text",
              paragraphId: paragraph.id,
              nodeId: textNode.id,
              offset: 0,
            },
            root
          );
        }

        return fragment;
      }

      if (!isFullDocument) {
        const session = sessionSelectionRef.current;
        const hasSessionRange =
          session &&
          !(
            session.anchor.paragraphId ===
              session.focus.paragraphId &&
            session.anchor.nodeId === session.focus.nodeId &&
            session.anchor.kind === session.focus.kind &&
            session.anchor.offset === session.focus.offset
          );

        if (hasSessionRange) {
          const next = deleteDocumentRange(
            syncedDocument,
            session.anchor,
            session.focus,
            root
          );
          const caret = resolveCaretAfterRangeDelete(
            session.anchor,
            session.focus,
            syncedDocument,
            next,
            root
          );

          update(next);
          clearSessionSelection();
          disarmCopySelection();
          restoreCaret(caret, root);
          return fragment;
        }

        if (!state || state.collapsed) {
          return null;
        }

        const next = deleteDocumentRange(
          syncedDocument,
          state.anchor,
          state.focus,
          root
        );
        const caret = resolveCaretAfterRangeDelete(
          state.anchor,
          state.focus,
          syncedDocument,
          next,
          root
        );

        update(next);
        clearSessionSelection();
        disarmCopySelection();
        restoreCaret(caret, root);
        return fragment;
      }

      return fragment;
    },
    paste: (fragment) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      const syncedDocument = syncDocumentFromDom(
        documentRef.current,
        root
      );

      const state = resolvePasteSelectionState(
        documentRef.current,
        root,
        sessionSelectionRef.current,
        cursor.current.get()
      );

      if (!state) {
        if (
          isEffectivelyEmptyDocument(
            syncedDocument,
            root
          )
        ) {
          recordHistoryBeforeChange();
          const next = replaceDocumentContent(
            syncedDocument,
            fragment
          );
          update(next);
          clearSessionSelection();
          disarmCopySelection();

          const focus = findFirstTextPointForPaste(next);

          if (focus) {
            restoreCaret(
              {
                kind: "text",
                paragraphId: focus.paragraphId,
                nodeId: focus.nodeId,
                offset: focus.offset,
              },
              root
            );
          }

          return;
        }

        return;
      }

      recordHistoryBeforeChange();

      const result = applyClipboardFragment(
        syncedDocument,
        state,
        fragment,
        root
      );

      update(result.document);
      clearSessionSelection();
      disarmCopySelection();

      if (result.focus) {
        restoreCaret(
          {
            kind: "text",
            paragraphId: result.focus.paragraphId,
            nodeId: result.focus.nodeId,
            offset: result.focus.offset,
          },
          root
        );
      }
    },
    finalizeClipboardOperation: () => {
      disarmCopySelection();
    },
  };

  useLayoutEffect(() => {
    const surface = editorAreaRef.current;

    if (!surface || !sessionControllerRef.current) {
      return;
    }

    registerEditorSessionController(
      surface,
      sessionId,
      sessionControllerRef.current
    );
  });

  useEffect(() => {
    const surface = editorAreaRef.current;

    if (!surface) {
      return;
    }

    return () => {
      unregisterEditorSessionController(surface, sessionId);
    };
  }, [sessionId]);

  const beginPointerSelection = useCallback(
    (clientX: number, clientY: number) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      const anchor = resolvePointFromPointer(
        clientX,
        clientY,
        root,
        documentRef.current
      );

      if (!anchor) {
        return;
      }

      dragSelectionRef.current = {
        anchor,
        active: true,
        moved: false,
      };

      const handleMove = (event: MouseEvent) => {
        const drag = dragSelectionRef.current;

        if (
          !drag.active ||
          event.buttons !== 1 ||
          !drag.anchor
        ) {
          return;
        }

        const point = resolvePointFromPointer(
          event.clientX,
          event.clientY,
          root,
          documentRef.current
        );

        if (!point) {
          return;
        }

        const unchanged =
          drag.anchor.paragraphId ===
            point.paragraphId &&
          drag.anchor.nodeId === point.nodeId &&
          drag.anchor.kind === point.kind &&
          drag.anchor.offset === point.offset;

        if (unchanged) {
          return;
        }

        drag.moved = true;
        event.preventDefault();
        window.getSelection()?.removeAllRanges();
        setSessionSelection(
          drag.anchor,
          point,
          false
        );
      };

      const handleUp = () => {
        const drag = dragSelectionRef.current;
        drag.active = false;

        window.document.removeEventListener(
          "mousemove",
          handleMove,
          true
        );
        window.document.removeEventListener(
          "mouseup",
          handleUp,
          true
        );

        if (!drag.moved && drag.anchor) {
          if (!armedForCopyRef.current) {
            clearSessionSelection();
            disarmCopySelection();
          }

          if (drag.anchor.kind === "text") {
            cursor.current.set({
              paragraphId: drag.anchor.paragraphId,
              nodeId: drag.anchor.nodeId,
              offset: drag.anchor.offset,
            });
          }
        }
      };

      window.document.addEventListener(
        "mousemove",
        handleMove,
        true
      );
      window.document.addEventListener(
        "mouseup",
        handleUp,
        true
      );
    },
    [clearSessionSelection, setSessionSelection]
  );

  useEffect(() => {
    ensureEditorShortcutHandlers();
  }, []);

  useEffect(() => {
    const handler = handleEditorKeyDownCapture;

    window.addEventListener("keydown", handler, true);

    return () => {
      window.removeEventListener("keydown", handler, true);
    };
  }, [handleEditorKeyDownCapture]);

  useEffect(() => {
    if (normalizedOnce.current) {
      return;
    }

    normalizedOnce.current = true;

    const normalized = ensureDocumentInlineEditing(
      document
    );

    if (normalized !== document) {
      update(normalized);
    }
  }, [document]);

  useEffect(() => {
    if (historyReadyRef.current) {
      return;
    }

    historyReadyRef.current = true;
    historyRef.current.reset(document);
  }, []);

  function handleTextChange(
    paragraphId: string,
    nodeId: string,
    text: string
  ) {
    const current = documentRef.current;
    const paragraph = current.paragraphs.find(
      (item) => item.id === paragraphId
    );
    const node = paragraph?.children.find(
      (item) => item.id === nodeId
    );

    if (!node || node.type !== "text") {
      return;
    }

    if (node.text === text) {
      return;
    }

    recordHistoryBeforeChange();
    update(
      updateText(current, paragraphId, nodeId, text)
    );
  }

  function handleMathChange(
    paragraphId: string,
    nodeId: string,
    latex: string
  ) {
    const current = documentRef.current;
    const paragraph = current.paragraphs.find(
      (item) => item.id === paragraphId
    );
    const node = paragraph?.children.find(
      (item) => item.id === nodeId
    );

    if (node?.type === "math" && node.latex === latex) {
      return;
    }

    recordHistoryBeforeChange();
    update(
      updateMath(current, paragraphId, nodeId, latex)
    );
  }

  function handleTableTextChange(
    paragraphId: string,
    tableNodeId: string,
    rowId: string,
    textNodeId: string,
    text: string
  ) {
    const current = documentRef.current;
    const paragraph = current.paragraphs.find(
      (item) => item.id === paragraphId
    );
    const tableNode = paragraph?.children.find(
      (item) => item.id === tableNodeId && item.type === "true-false-table"
    );

    if (tableNode?.type !== "true-false-table") {
      return;
    }

    const row = tableNode.rows.find((item) => item.id === rowId);
    const node = row?.statement.find((item) => item.id === textNodeId);

    if (!node || node.type !== "text" || node.text === text) {
      return;
    }

    recordHistoryBeforeChange();
    update(
      updateTrueFalseTableText(
        current,
        paragraphId,
        tableNodeId,
        rowId,
        textNodeId,
        text
      )
    );
  }

  function handleTableMathChange(
    paragraphId: string,
    tableNodeId: string,
    rowId: string,
    mathNodeId: string,
    latex: string
  ) {
    const current = documentRef.current;
    const paragraph = current.paragraphs.find(
      (item) => item.id === paragraphId
    );
    const tableNode = paragraph?.children.find(
      (item) => item.id === tableNodeId && item.type === "true-false-table"
    );

    if (tableNode?.type !== "true-false-table") {
      return;
    }

    const row = tableNode.rows.find((item) => item.id === rowId);
    const node = row?.statement.find((item) => item.id === mathNodeId);

    if (node?.type === "math" && node.latex === latex) {
      return;
    }

    recordHistoryBeforeChange();
    update(
      updateTrueFalseTableMath(
        current,
        paragraphId,
        tableNodeId,
        rowId,
        mathNodeId,
        latex
      )
    );
  }

  function focusFirstTextNode() {
    const editable =
      editorAreaRef.current?.querySelector(
        "[contenteditable='true']"
      ) as HTMLElement | null;

    editable?.focus();
  }

  const waitForMathField = useCallback(
    (nodeId?: string | null) =>
      new Promise<void>((resolve) => {
        const root = editorAreaRef.current;
        const selector = nodeId
          ? `[data-node-id="${nodeId}"] math-field`
          : "math-field";

        const tryFocus = (attempts = 0) => {
          const field = nodeId
            ? root?.querySelector(selector)
            : root?.querySelectorAll(selector).item(
                (root?.querySelectorAll(selector).length ??
                  1) - 1
              );

          if (field) {
            focusMathField(field);
            resolve();
            return;
          }

          if (attempts < 12) {
            requestAnimationFrame(() =>
              tryFocus(attempts + 1)
            );
          } else {
            resolve();
          }
        };

        tryFocus();
      }),
    []
  );

  const resolveInsertPosition =
    useCallback((): ResolvedInsertPosition | null => {
      const root = editorAreaRef.current;

      if (!root) {
        return null;
      }

      const resolved = resolveEditorInsertPosition(
        document,
        root,
        cursor.current.get(),
        sessionSelectionRef.current
      );

      if (resolved) {
        cursor.current.set(resolved);
      }

      return resolved;
    }, [document]);

  const insertMathAtCaret = useCallback(async () => {
    const root = editorAreaRef.current;
    let position = resolveInsertPosition();

    if (!position || !root) {
      return null;
    }

    clearSessionSelection();

    focusInlineTextNode(
      position.paragraphId,
      position.nodeId,
      position.offset,
      root
    );

    let paragraph = document.paragraphs.find(
      (item) => item.id === position!.paragraphId
    );
    let textNode = paragraph?.children.find(
      (item) => item.id === position!.nodeId
    );

    // Caret may sit on a math field — use the last text node in the document.
    if (!textNode || textNode.type !== "text") {
      let found = false;
      for (let i = document.paragraphs.length - 1; i >= 0 && !found; i--) {
        const p = document.paragraphs[i];
        for (let j = p.children.length - 1; j >= 0; j--) {
          const child = p.children[j];
          if (child.type === "text") {
            paragraph = p;
            textNode = child;
            position = {
              paragraphId: p.id,
              nodeId: child.id,
              offset: child.text.length,
              liveText: child.text,
            };
            found = true;
            break;
          }
        }
      }
    }

    if (!textNode || textNode.type !== "text" || !paragraph || !position) {
      return null;
    }

    let workingDocument = documentRef.current;

    if (textNode.text !== position.liveText) {
      workingDocument = updateText(
        workingDocument,
        position.paragraphId,
        position.nodeId,
        position.liveText
      );
    }

    if (!isApplyingHistoryRef.current) {
      historyRef.current.push(
        workingDocument,
        cursor.current.get()
      );
    }

    const result = insertMath(
      workingDocument,
      position.paragraphId,
      position.nodeId,
      position.offset,
      position.selectionEnd
    );

    setAutoFocusMathId(result.insertedNodeId);
    cursor.current.setNode(
      position.paragraphId,
      result.insertedNodeId,
      0
    );
    update(result.document);
    await waitForMathField(result.insertedNodeId);
    return result.insertedNodeId;
  }, [
    document,
    resolveInsertPosition,
    waitForMathField,
    clearSessionSelection,
  ]);

  const insertMathAtCaretRef = useRef(insertMathAtCaret);
  insertMathAtCaretRef.current = insertMathAtCaret;

  const ensureMathFocus = useCallback(async () => {
    const root = editorAreaRef.current;
    const active = resolveActiveField(root);

    if (active) {
      focusMathField(active);
      return;
    }

    const focusedWithin = root?.querySelector(
      "math-field:focus-within"
    );

    if (focusedWithin) {
      focusMathField(focusedWithin);
      return;
    }

    await insertMathAtCaret();
  }, [insertMathAtCaret]);

  const insertMathTemplateAtCaret = useCallback(
    async (template: MathTemplateKey) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      clearSessionSelection();
      await ensureMathFocus();
      insertMathTemplate(template, root);
    },
    [clearSessionSelection, ensureMathFocus]
  );

  const insertMathTemplateAtCaretRef = useRef(
    insertMathTemplateAtCaret
  );
  insertMathTemplateAtCaretRef.current =
    insertMathTemplateAtCaret;

  const registerShortcutTarget = useCallback(() => {
    const surface = editorAreaRef.current;

    if (!surface) {
      return;
    }

    setActiveEditorShortcutTarget({
      surface,
      onInsertMath: () => insertMathAtCaretRef.current(),
      onInsertMathTemplate: (template) =>
        insertMathTemplateAtCaretRef.current(template),
    });
  }, []);

  const handleMathRemove = useCallback(
    (
      paragraphId: string,
      nodeId: string,
      _direction: "backward" | "forward"
    ) => {
      const root = editorAreaRef.current;
      const currentDocument = documentRef.current;
      const paragraph = currentDocument.paragraphs.find(
        (item) => item.id === paragraphId
      );

      if (!paragraph || !root) {
        return;
      }

      const index = paragraph.children.findIndex(
        (item) => item.id === nodeId
      );

      if (index === -1) {
        return;
      }

      const childrenBeforeRemoval = root
        ? syncParagraphLiveText(
            paragraphId,
            paragraph.children,
            root
          )
        : paragraph.children;

      const syncedDocument =
        childrenBeforeRemoval === paragraph.children
          ? currentDocument
          : {
              ...currentDocument,
              paragraphs: currentDocument.paragraphs.map(
                (item) =>
                  item.id === paragraphId
                    ? {
                        ...item,
                        children: childrenBeforeRemoval,
                      }
                    : item
              ),
            };

      recordHistoryBeforeChange();

      const nextDocument = removeNode(
        syncedDocument,
        paragraphId,
        nodeId
      );

      const nextParagraph = nextDocument.paragraphs.find(
        (item) => item.id === paragraphId
      );

      const restoreTarget = resolveCaretAfterMathRemoval(
        paragraphId,
        index,
        childrenBeforeRemoval,
        nextParagraph?.children ?? [],
        root
      );

      flushSync(() => {
        update(nextDocument);
        setSelectedNodeId(null);
        setAutoFocusMathId(null);
      });

      if (restoreTarget) {
        restoreCaret(restoreTarget, root);
      }
    },
    [restoreCaret]
  );

  const getSelectedImageAlign = useCallback((): ImageAlign => {
    if (!selectedImage) {
      return "left";
    }

    const paragraph = documentRef.current.paragraphs.find(
      (item) => item.id === selectedImage.paragraphId
    );
    const node = paragraph?.children.find(
      (item) => item.id === selectedImage.nodeId
    );

    if (node?.type === "image") {
      return node.align ?? "left";
    }

    return "left";
  }, [selectedImage]);

  const applyImageAtCaret = useCallback(
    async (image: ImageFileData) => {
      const root = editorAreaRef.current;
      const position = resolveInsertPosition();

      if (!position || !root) {
        return null;
      }

      clearSessionSelection();

      let workingDocument = documentRef.current;
      const paragraph = workingDocument.paragraphs.find(
        (item) => item.id === position.paragraphId
      );
      const textNode = paragraph?.children.find(
        (item) => item.id === position.nodeId
      );

      if (!textNode || textNode.type !== "text") {
        return null;
      }

      if (textNode.text !== position.liveText) {
        workingDocument = updateText(
          workingDocument,
          position.paragraphId,
          position.nodeId,
          position.liveText
        );
      }

      recordHistoryBeforeChange();

      const result = insertImage(
        workingDocument,
        position.paragraphId,
        position.nodeId,
        position.offset,
        image,
        position.selectionEnd
      );

      update(result.document);
      setSelectedImage({
        paragraphId: position.paragraphId,
        nodeId: result.insertedNodeId,
      });
      setSelectedNodeId(result.insertedNodeId);

      return result.insertedNodeId;
    },
    [clearSessionSelection, resolveInsertPosition]
  );

  const handleImageFile = useCallback(
    async (file: File) => {
      try {
        const image = await readImageFileAsDataUrl(file);

        if (fileInputModeRef.current === "replace" && selectedImage) {
          recordHistoryBeforeChange();
          update(
            updateImage(
              documentRef.current,
              selectedImage.paragraphId,
              selectedImage.nodeId,
              {
                src: image.src,
                width: image.width,
                height: image.height,
                alt: image.alt,
              }
            )
          );
          return;
        }

        await applyImageAtCaret(image);
      } catch {
        // Ignore unreadable image files.
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        fileInputModeRef.current = "insert";
      }
    },
    [applyImageAtCaret, selectedImage]
  );

  const openImageFilePicker = useCallback(
    (mode: "insert" | "replace") => {
      fileInputModeRef.current = mode;
      fileInputRef.current?.click();
    },
    []
  );

  const handleImageSelect = useCallback(
    (paragraphId: string, nodeId: string) => {
      setSelectedImage({ paragraphId, nodeId });
      setSelectedInk(null);
      setSelectedNodeId(nodeId);
      clearSessionSelection();
      window.getSelection()?.removeAllRanges();

      requestAnimationFrame(() => {
        const root = editorAreaRef.current;
        const image = root?.querySelector(
          `[data-node-id="${nodeId}"][data-node-type="image"]`
        ) as HTMLElement | null;
        image?.focus();
      });
    },
    [clearSessionSelection]
  );

  const handleImageResize = useCallback(
    (
      paragraphId: string,
      nodeId: string,
      width: number,
      height: number
    ) => {
      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === paragraphId
      );
      const node = paragraph?.children.find(
        (item) => item.id === nodeId
      );

      if (node?.type !== "image") {
        return;
      }

      if (node.width === width && node.height === height) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        updateImage(documentRef.current, paragraphId, nodeId, {
          width,
          height,
        })
      );
    },
    []
  );

  const handleImageRemove = useCallback(
    (paragraphId: string, nodeId: string) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === paragraphId
      );
      const index = paragraph?.children.findIndex(
        (item) => item.id === nodeId
      );

      if (!paragraph || index === undefined || index === -1) {
        return;
      }

      recordHistoryBeforeChange();

      const nextDocument = removeNode(
        documentRef.current,
        paragraphId,
        nodeId
      );

      const nextParagraph = nextDocument.paragraphs.find(
        (item) => item.id === paragraphId
      );

      const restoreTarget = resolveCaretAfterMathRemoval(
        paragraphId,
        index,
        paragraph.children,
        nextParagraph?.children ?? [],
        root
      );

      update(nextDocument);
      setSelectedImage(null);
      setSelectedNodeId(null);

      if (restoreTarget) {
        restoreCaret(restoreTarget, root);
      }
    },
    [restoreCaret]
  );

  const handleImageAlign = useCallback(
    (align: ImageAlign) => {
      if (!selectedImage) {
        return;
      }

      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === selectedImage.paragraphId
      );
      const node = paragraph?.children.find(
        (item) => item.id === selectedImage.nodeId
      );

      if (node?.type !== "image" || node.align === align) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        updateImage(
          documentRef.current,
          selectedImage.paragraphId,
          selectedImage.nodeId,
          { align }
        )
      );
    },
    [selectedImage]
  );

  const handleImageMoveStart = useCallback(
    (paragraphId: string, nodeId: string) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      draggingImageRef.current = {
        paragraphId,
        nodeId,
        active: true,
        moved: false,
      };

      const handleMove = (event: MouseEvent) => {
        const drag = draggingImageRef.current;

        if (!drag?.active || event.buttons !== 1) {
          return;
        }

        drag.moved = true;
      };

      const handleUp = (event: MouseEvent) => {
        const drag = draggingImageRef.current;
        draggingImageRef.current = null;

        window.document.removeEventListener(
          "mousemove",
          handleMove,
          true
        );
        window.document.removeEventListener(
          "mouseup",
          handleUp,
          true
        );

        if (!drag?.active || !drag.moved) {
          return;
        }

        const point = resolvePointFromPointer(
          event.clientX,
          event.clientY,
          root,
          documentRef.current
        );

        if (
          !point ||
          point.kind !== "text" ||
          (point.paragraphId === drag.paragraphId &&
            point.nodeId === drag.nodeId)
        ) {
          return;
        }

        recordHistoryBeforeChange();

        const next = moveImage(
          documentRef.current,
          drag.paragraphId,
          drag.nodeId,
          point.paragraphId,
          point.nodeId,
          point.offset
        );

        update(next);
        setSelectedImage({
          paragraphId: point.paragraphId,
          nodeId: drag.nodeId,
        });
        setSelectedNodeId(drag.nodeId);
      };

      window.document.addEventListener(
        "mousemove",
        handleMove,
        true
      );
      window.document.addEventListener(
        "mouseup",
        handleUp,
        true
      );
    },
    []
  );

  const getSelectedInkAlign = useCallback((): ImageAlign => {
    if (!selectedInk) {
      return "left";
    }

    const paragraph = documentRef.current.paragraphs.find(
      (item) => item.id === selectedInk.paragraphId
    );
    const node = paragraph?.children.find(
      (item) => item.id === selectedInk.nodeId
    );

    if (node?.type === "ink") {
      return node.align ?? "left";
    }

    return "left";
  }, [selectedInk]);

  const applyInkAtCaret = useCallback(() => {
    const position = resolveInsertPosition();

    if (!position) {
      return null;
    }

    clearSessionSelection();

    let workingDocument = documentRef.current;
    const paragraph = workingDocument.paragraphs.find(
      (item) => item.id === position.paragraphId
    );
    const textNode = paragraph?.children.find(
      (item) => item.id === position.nodeId
    );

    if (!textNode || textNode.type !== "text") {
      return null;
    }

    if (textNode.text !== position.liveText) {
      workingDocument = updateText(
        workingDocument,
        position.paragraphId,
        position.nodeId,
        position.liveText
      );
    }

    recordHistoryBeforeChange();

    const inExpandedSolution = Boolean(
      editorAreaRef.current?.closest(
        ".task-editor-workspace__solution--expanded"
      )
    );

    const result = insertInk(
      workingDocument,
      position.paragraphId,
      position.nodeId,
      position.offset,
      {
        width: inExpandedSolution ? 960 : DEFAULT_INK_WIDTH,
        height: inExpandedSolution ? 540 : DEFAULT_INK_HEIGHT,
        strokes: [],
      },
      position.selectionEnd
    );

    update(result.document);
    setSelectedInk({
      paragraphId: position.paragraphId,
      nodeId: result.insertedNodeId,
    });
    setSelectedImage(null);
    setSelectedNodeId(result.insertedNodeId);
    setEditorMode("pen");

    return result.insertedNodeId;
  }, [clearSessionSelection, resolveInsertPosition]);

  const handleInkSelect = useCallback(
    (paragraphId: string, nodeId: string) => {
      setSelectedInk((current) => {
        if (
          current?.paragraphId === paragraphId &&
          current?.nodeId === nodeId
        ) {
          return current;
        }

        setSelectedInkStrokeIndices([]);
        return { paragraphId, nodeId };
      });
      setSelectedImage(null);
      setSelectedNodeId(nodeId);
      clearSessionSelection();
      window.getSelection()?.removeAllRanges();

      requestAnimationFrame(() => {
        const root = editorAreaRef.current;
        const ink = root?.querySelector(
          `[data-node-id="${nodeId}"][data-node-type="ink"]`
        ) as HTMLElement | null;
        ink?.focus();
      });
    },
    [clearSessionSelection]
  );

  const handleInkStrokeSelectionChange = useCallback(
    (paragraphId: string, nodeId: string, indices: number[]) => {
      setSelectedInk({ paragraphId, nodeId });
      setSelectedImage(null);
      setSelectedNodeId(nodeId);
      setSelectedInkStrokeIndices(indices);
    },
    []
  );

  const handleInkStrokesChange = useCallback(
    (
      paragraphId: string,
      nodeId: string,
      strokes: InkStroke[]
    ) => {
      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === paragraphId
      );
      const node = paragraph?.children.find(
        (item) => item.id === nodeId
      );

      if (node?.type !== "ink") {
        return;
      }

      if (JSON.stringify(node.strokes) === JSON.stringify(strokes)) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        updateInk(documentRef.current, paragraphId, nodeId, {
          strokes,
        })
      );
    },
    []
  );

  const handleInkResize = useCallback(
    (
      paragraphId: string,
      nodeId: string,
      width: number,
      height: number
    ) => {
      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === paragraphId
      );
      const node = paragraph?.children.find(
        (item) => item.id === nodeId
      );

      if (node?.type !== "ink") {
        return;
      }

      if (node.width === width && node.height === height) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        updateInk(documentRef.current, paragraphId, nodeId, {
          width,
          height,
          strokes: scaleInkStrokes(
            node.strokes,
            node.width,
            node.height,
            width,
            height
          ),
        })
      );
    },
    []
  );

  const handleInkRemove = useCallback(
    (paragraphId: string, nodeId: string) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === paragraphId
      );
      const index = paragraph?.children.findIndex(
        (item) => item.id === nodeId
      );

      if (!paragraph || index === undefined || index === -1) {
        return;
      }

      recordHistoryBeforeChange();

      const nextDocument = removeNode(
        documentRef.current,
        paragraphId,
        nodeId
      );

      const nextParagraph = nextDocument.paragraphs.find(
        (item) => item.id === paragraphId
      );

      const restoreTarget = resolveCaretAfterMathRemoval(
        paragraphId,
        index,
        paragraph.children,
        nextParagraph?.children ?? [],
        root
      );

      update(nextDocument);
      setSelectedInk(null);
      setSelectedInkStrokeIndices([]);
      setSelectedNodeId(null);

      if (restoreTarget) {
        restoreCaret(restoreTarget, root);
      }
    },
    [restoreCaret]
  );

  const handleInkAlign = useCallback(
    (align: ImageAlign) => {
      if (!selectedInk) {
        return;
      }

      const paragraph = documentRef.current.paragraphs.find(
        (item) => item.id === selectedInk.paragraphId
      );
      const node = paragraph?.children.find(
        (item) => item.id === selectedInk.nodeId
      );

      if (node?.type !== "ink" || node.align === align) {
        return;
      }

      recordHistoryBeforeChange();
      update(
        updateInk(
          documentRef.current,
          selectedInk.paragraphId,
          selectedInk.nodeId,
          { align }
        )
      );
    },
    [selectedInk]
  );

  const handleOpenInkMathDialog = useCallback(() => {
    setInkMathDialogOpen(true);
  }, []);

  const handleCancelInkMathConversion = useCallback(() => {
    setInkMathDialogOpen(false);
  }, []);

  const handleAcceptInkMathConversion = useCallback(
    async (latex: string) => {
      const trimmed = latex.trim();
      if (!trimmed) {
        return;
      }

      // Dialog steals focus — drop DOM selection so insert falls back to
      // stored caret / last text node instead of failing silently.
      try {
        window.getSelection()?.removeAllRanges();
      } catch {
        // ignore
      }

      let mathId = await insertMathAtCaret();
      let workingDocument = documentRef.current;

      if (!mathId) {
        let paragraphId: string | null = null;
        let nodeId: string | null = null;
        let offset = 0;

        for (let i = workingDocument.paragraphs.length - 1; i >= 0; i--) {
          const paragraph = workingDocument.paragraphs[i];
          for (let j = paragraph.children.length - 1; j >= 0; j--) {
            const child = paragraph.children[j];
            if (child.type === "text") {
              paragraphId = paragraph.id;
              nodeId = child.id;
              offset = child.text.length;
              break;
            }
          }
          if (paragraphId) {
            break;
          }
        }

        if (!paragraphId || !nodeId) {
          return;
        }

        const result = insertMath(
          workingDocument,
          paragraphId,
          nodeId,
          offset
        );
        mathId = result.insertedNodeId;
        workingDocument = result.document;
        cursor.current.setNode(paragraphId, mathId, 0);
      }

      let paragraphId =
        cursor.current.get()?.paragraphId ??
        null;

      if (!paragraphId) {
        for (const paragraph of workingDocument.paragraphs) {
          if (paragraph.children.some((child) => child.id === mathId)) {
            paragraphId = paragraph.id;
            break;
          }
        }
      }

      if (!paragraphId) {
        setInkMathDialogOpen(false);
        return;
      }

      recordHistoryBeforeChange();
      update(updateMath(workingDocument, paragraphId, mathId, trimmed));
      setAutoFocusMathId(mathId);
      setSelectedNodeId(mathId);
      setInkMathDialogOpen(false);
      await waitForMathField(mathId);
    },
    [insertMathAtCaret, waitForMathField]
  );

  const handleInkMoveStart = useCallback(
    (paragraphId: string, nodeId: string) => {
      if (editorMode === "pen" || editorMode === "eraser") {
        return;
      }

      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      draggingInkRef.current = {
        paragraphId,
        nodeId,
        active: true,
        moved: false,
      };

      const handleMove = (event: MouseEvent) => {
        const drag = draggingInkRef.current;

        if (!drag?.active || event.buttons !== 1) {
          return;
        }

        drag.moved = true;
      };

      const handleUp = (event: MouseEvent) => {
        const drag = draggingInkRef.current;
        draggingInkRef.current = null;

        window.document.removeEventListener(
          "mousemove",
          handleMove,
          true
        );
        window.document.removeEventListener(
          "mouseup",
          handleUp,
          true
        );

        if (!drag?.active || !drag.moved) {
          return;
        }

        const point = resolvePointFromPointer(
          event.clientX,
          event.clientY,
          root,
          documentRef.current
        );

        if (
          !point ||
          point.kind !== "text" ||
          (point.paragraphId === drag.paragraphId &&
            point.nodeId === drag.nodeId)
        ) {
          return;
        }

        recordHistoryBeforeChange();

        const next = moveInk(
          documentRef.current,
          drag.paragraphId,
          drag.nodeId,
          point.paragraphId,
          point.nodeId,
          point.offset
        );

        update(next);
        setSelectedInk({
          paragraphId: point.paragraphId,
          nodeId: drag.nodeId,
        });
        setSelectedNodeId(drag.nodeId);
      };

      window.document.addEventListener(
        "mousemove",
        handleMove,
        true
      );
      window.document.addEventListener(
        "mouseup",
        handleUp,
        true
      );
    },
    [editorMode]
  );

  const handleEditorPaste = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      const root = editorAreaRef.current;

      if (!root || resolveFocusedEditorSurface() !== root) {
        return;
      }

      const file = extractClipboardImageFile(event.clipboardData);

      if (!file) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      await handleImageFile(file);
    },
    [handleImageFile]
  );

  const handleEditorDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      const root = editorAreaRef.current;

      if (!root) {
        return;
      }

      event.preventDefault();
      setDragOverEditor(false);

      const file = Array.from(event.dataTransfer.files).find((item) =>
        item.type.startsWith("image/")
      );

      if (file) {
        const point = resolvePointFromPointer(
          event.clientX,
          event.clientY,
          root,
          documentRef.current
        );

        if (point?.kind === "text") {
          cursor.current.set({
            paragraphId: point.paragraphId,
            nodeId: point.nodeId,
            offset: point.offset,
          });
        }

        await handleImageFile(file);
      }
    },
    [handleImageFile]
  );

  const toolbarTargetRef = useRef<EditorToolbarTarget>({
    editorRoot: editorAreaRef,
    onInsertMath: async () => null,
    onInsertMathTemplate: async () => {},
    onInsertImage: () => {},
    onReplaceImage: () => {},
    onAlignImage: () => {},
    hasSelectedImage: () => false,
    getSelectedImageAlign: () => "left",
    getEditorMode: () => "select",
    onEditorModeChange: () => {},
    getInkColor: () => DEFAULT_INK_STROKE_COLOR,
    onInkColorChange: () => {},
    onInsertInk: () => null,
    onAlignInk: () => {},
    hasSelectedInk: () => false,
    getSelectedInkAlign: () => "left",
    onDeleteEntireContent: () => {},
    ensureMathFocus: async () => {},
  });

  toolbarTargetRef.current = {
    editorRoot: editorAreaRef,
    onInsertMath: insertMathAtCaret,
    onInsertMathTemplate: insertMathTemplateAtCaret,
    onInsertImage: () => openImageFilePicker("insert"),
    onReplaceImage: () => openImageFilePicker("replace"),
    onAlignImage: handleImageAlign,
    hasSelectedImage: () => Boolean(selectedImage),
    getSelectedImageAlign,
    getEditorMode: () => editorMode,
    onEditorModeChange: setEditorMode,
    getInkColor: () => inkColor,
    onInkColorChange: setInkColor,
    onInsertInk: applyInkAtCaret,
    onAlignInk: handleInkAlign,
    hasSelectedInk: () => Boolean(selectedInk),
    getSelectedInkAlign,
    onConvertInkToMath: handleOpenInkMathDialog,
    onDeleteEntireContent: handleDeleteEntireContent,
    ensureMathFocus,
  };

  useImperativeHandle(ref, () => ({
    ...toolbarTargetRef.current,
    commitDocument,
    scrollToParagraph,
    duplicateBlocks: handleDuplicateBlocks,
    moveBlocksUp: () => handleMoveBlocks(-1),
    moveBlocksDown: () => handleMoveBlocks(1),
    toggleOutline: handleToggleOutline,
    getOutlineVisible: () => outlineVisible,
    hasBlockSelection: () => paragraphSelection.selectedIds.size > 0,
    onReplaceImage: () => openImageFilePicker("replace"),
    onAlignImage: handleImageAlign,
    hasSelectedImage: () => Boolean(selectedImage),
    getSelectedImageAlign,
    getEditorMode: () => editorMode,
    onEditorModeChange: setEditorMode,
    getInkColor: () => inkColor,
    onInkColorChange: setInkColor,
    onInsertInk: applyInkAtCaret,
    onAlignInk: handleInkAlign,
    hasSelectedInk: () => Boolean(selectedInk),
    getSelectedInkAlign,
    onConvertInkToMath: handleOpenInkMathDialog,
  }), [
    commitDocument,
    insertMathAtCaret,
    insertMathTemplateAtCaret,
    openImageFilePicker,
    handleImageAlign,
    selectedImage,
    getSelectedImageAlign,
    editorMode,
    inkColor,
    applyInkAtCaret,
    handleInkAlign,
    selectedInk,
    getSelectedInkAlign,
    handleOpenInkMathDialog,
    handleAcceptInkMathConversion,
    handleDeleteEntireContent,
    ensureMathFocus,
    scrollToParagraph,
    handleDuplicateBlocks,
    handleMoveBlocks,
    handleToggleOutline,
    outlineVisible,
    paragraphSelection.selectedIds,
  ]);

  const notifyActivate = useCallback(() => {
    if (editorAreaRef.current) {
      setActiveEditorSurface(editorAreaRef.current);
      registerShortcutTarget();
    }

    onActivate?.(toolbarTargetRef.current);
  }, [onActivate, registerShortcutTarget]);

  useEffect(() => {
    if (!autoFocusMathId) {
      return;
    }

    const id = autoFocusMathId;

    const timer = window.setTimeout(() => {
      if (autoFocusMathId === id) {
        setAutoFocusMathId(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocusMathId]);

  useEffect(() => {
    if (!defaultFocusMathNodeId) {
      return;
    }

    setAutoFocusMathId(defaultFocusMathNodeId);
  }, [defaultFocusMathNodeId, sessionId]);

  useEffect(() => {
    const root = editorAreaRef.current;

    if (!root) {
      return;
    }

    const syncSelectionToCursor = () => {
      if (dragSelectionRef.current.active) {
        return;
      }

      if (
        suppressSelectionSyncRef.current ||
        pendingCaretRestoreRef.current ||
        isApplyingHistoryRef.current
      ) {
        return;
      }

      if (
        sessionSelectionRef.current?.isFullDocument ||
        armedForCopyRef.current ||
        isFullDocumentClipboardArmed(sessionId)
      ) {
        return;
      }

      const domState = readEditorSelection(document, root);

      if (
        domState &&
        !domState.collapsed &&
        !domState.isFullDocument &&
        domState.anchor.paragraphId ===
          domState.focus.paragraphId &&
        domState.anchor.nodeId === domState.focus.nodeId &&
        domState.anchor.kind === "text" &&
        domState.focus.kind === "text"
      ) {
        setSessionSelection(
          domState.anchor,
          domState.focus,
          false
        );
      } else if (!sessionSelectionRef.current?.isFullDocument) {
        if (domState?.insertPosition) {
          cursor.current.set(domState.insertPosition);
        }
      }

      const state = readEditorSelection(
        document,
        root,
        sessionSelectionRef.current
      );

      if (state?.insertPosition) {
        cursor.current.set(state.insertPosition);
      }
    };

    window.document.addEventListener(
      "selectionchange",
      syncSelectionToCursor
    );

    return () => {
      window.document.removeEventListener(
        "selectionchange",
        syncSelectionToCursor
      );
    };
  }, [document, sessionId, setSessionSelection]);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-300 bg-white ${layoutShellClass[layout]} ${className}`.trim()}
    >
      {!hideToolbar ? (
        <Toolbar
          editorRoot={editorAreaRef}
          onInsertMath={insertMathAtCaret}
          ensureMathFocus={ensureMathFocus}
          onInsertImage={() => openImageFilePicker("insert")}
          onReplaceImage={() => openImageFilePicker("replace")}
          onAlignImage={handleImageAlign}
          hasSelectedImage={Boolean(selectedImage)}
          selectedImageAlign={getSelectedImageAlign()}
          editorMode={editorMode}
          onEditorModeChange={setEditorMode}
          inkColor={inkColor}
          onInkColorChange={setInkColor}
          onInsertInk={applyInkAtCaret}
          onAlignInk={handleInkAlign}
          hasSelectedInk={Boolean(selectedInk)}
          selectedInkAlign={getSelectedInkAlign()}
          onConvertInkToMath={handleOpenInkMathDialog}
          onDuplicateBlocks={handleDuplicateBlocks}
          onMoveBlocksUp={() => handleMoveBlocks(-1)}
          onMoveBlocksDown={() => handleMoveBlocks(1)}
          onToggleOutline={handleToggleOutline}
          outlineVisible={outlineVisible}
          hasBlockSelection={paragraphSelection.selectedIds.size > 0}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleImageFile(file);
          }
        }}
      />

      <div
        ref={editorAreaRef}
        className={`edunga-editor-surface cursor-text p-6 ${layoutSurfaceClass[layout]} ${
          dragOverEditor ? "edunga-editor-drag-over" : ""
        }`.trim()}
        onPaste={handleEditorPaste}
        onDragOver={(event) => {
          if (
            Array.from(event.dataTransfer.types).includes("Files")
          ) {
            event.preventDefault();
            setDragOverEditor(true);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setDragOverEditor(false);
          }
        }}
        onDrop={handleEditorDrop}
        onMouseDown={(event) => {
          notifyActivate();

          if (editorAreaRef.current) {
            markEditorSurfaceActive(editorAreaRef.current);
          }

          if (
            event.target === editorAreaRef.current ||
            (event.target as HTMLElement).closest(
              "[data-paragraph-id]"
            ) === event.target
          ) {
            setSelectedImage(null);
            setSelectedInk(null);
          }

          if (event.button === 0) {
            beginPointerSelection(
              event.clientX,
              event.clientY
            );
          }

          if (event.target === editorAreaRef.current) {
            event.preventDefault();
            focusFirstTextNode();
          }
        }}
        onKeyDownCapture={(event) => {
          const root = editorAreaRef.current;

          if (!root) {
            return;
          }

          if (resolveFocusedEditorSurface() !== root) {
            return;
          }

          const key = event.key;
          const hasModifier =
            event.ctrlKey ||
            event.metaKey ||
            event.altKey;
          const isSelectAllShortcut =
            hasModifier && key.toLowerCase() === "a";
          const isDeleteKey =
            key === "Delete" || key === "Backspace";

          if (isDeleteKey && selectedImage) {
            event.preventDefault();
            event.stopPropagation();
            handleImageRemove(
              selectedImage.paragraphId,
              selectedImage.nodeId
            );
            return;
          }

          if (isDeleteKey && selectedInk) {
            event.preventDefault();
            event.stopPropagation();
            handleInkRemove(
              selectedInk.paragraphId,
              selectedInk.nodeId
            );
            return;
          }

          const isClipboardShortcut =
            hasModifier &&
            ["c", "v", "x"].includes(key.toLowerCase());
          const isModifierOnlyKey =
            key === "Control" ||
            key === "Meta" ||
            key === "Alt" ||
            key === "Shift";

          if (
            isDeleteKey &&
            shouldDeleteEntireEditor(
              document,
              root,
              sessionSelectionRef.current
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            handleDeleteEntireContent();
            return;
          }

          if (
            hasModifier ||
            isSelectAllShortcut ||
            isDeleteKey ||
            isClipboardShortcut ||
            isModifierOnlyKey
          ) {
            return;
          }

          clearSessionSelection();
          disarmCopySelection();
        }}
        onFocusCapture={() => {
          if (editorAreaRef.current) {
            setActiveEditorSurface(editorAreaRef.current);
            markEditorSurfaceActive(editorAreaRef.current);
            registerShortcutTarget();
          }

          notifyActivate();
        }}
      >
        <DocumentRenderer
          document={document}
          editorRoot={editorAreaRef}
          selectedNodeId={selectedNodeId}
          rangeHighlightIds={rangeHighlightIds}
          autoFocusMathId={autoFocusMathId}
          selectedParagraphIds={paragraphSelection.selectedIds}
          collapsedSectionIds={collapsedSectionIds}
          dragOverParagraphId={dragOverParagraphId}
          dragOverPosition={dragOverPosition}
          onParagraphSelect={handleParagraphSelect}
          onParagraphDragStart={handleParagraphDragStart}
          onParagraphDragOver={(paragraphId, position) => {
            setDragOverParagraphId(paragraphId);
            setDragOverPosition(position);
          }}
          onParagraphDrop={handleParagraphDrop}
          onParagraphDragEnd={() => {
            draggingParagraphIdsRef.current = [];
            setDragOverParagraphId(null);
            setDragOverPosition(null);
          }}
          onToggleSection={handleToggleSection}
          onTextChange={handleTextChange}
          onMathChange={handleMathChange}
          onTableTextChange={handleTableTextChange}
          onTableMathChange={handleTableMathChange}
          onMathRemove={handleMathRemove}
          onImageSelect={handleImageSelect}
          onImageResize={handleImageResize}
          onImageRemove={handleImageRemove}
          onImageMoveStart={handleImageMoveStart}
          onInkSelect={handleInkSelect}
          onInkStrokeSelectionChange={handleInkStrokeSelectionChange}
          selectedInkStrokeIndices={selectedInkStrokeIndices}
          onInkStrokesChange={handleInkStrokesChange}
          onInkResize={handleInkResize}
          onInkRemove={handleInkRemove}
          onInkMoveStart={handleInkMoveStart}
          penMode={editorMode === "pen"}
          eraserMode={editorMode === "eraser"}
          inkColor={inkColor}
          onSelectAll={handleSelectAll}
          onCursorChange={(
            paragraphId,
            nodeId,
            offset
          ) => {
            cursor.current.set({
              paragraphId,
              nodeId,
              offset,
            });
          }}
          onNodeFocus={(_, nodeId) => {
            const paragraph = document.paragraphs.find((item) =>
              item.children.some((child) => child.id === nodeId)
            );
            const node = paragraph?.children.find(
              (child) => child.id === nodeId
            );

            if (node?.type === "image" && paragraph) {
              setSelectedImage({
                paragraphId: paragraph.id,
                nodeId,
              });
              setSelectedInk(null);
            } else if (node?.type === "ink" && paragraph) {
              setSelectedInk((current) => {
                if (
                  current?.paragraphId === paragraph.id &&
                  current?.nodeId === nodeId
                ) {
                  return current;
                }
                setSelectedInkStrokeIndices([]);
                return {
                  paragraphId: paragraph.id,
                  nodeId,
                };
              });
              setSelectedImage(null);
            } else {
              setSelectedImage(null);
              setSelectedInk(null);
              setSelectedInkStrokeIndices([]);
            }

            setSelectedNodeId(nodeId);
          }}
          onNodeBlur={() => {
            setSelectedNodeId(null);
          }}
        />
      </div>

      <JumpToBlockDialog
        document={document}
        open={jumpDialogOpen}
        onClose={() => setJumpDialogOpen(false)}
        onSelect={(paragraphId) => {
          setParagraphSelection({
            selectedIds: new Set([paragraphId]),
            anchorId: paragraphId,
          });
          scrollToParagraph(paragraphId);
        }}
      />

      {inkMathDialogOpen ? (
        <ConvertInkToMathDialog
          open
          onAccept={(latex) => {
            void handleAcceptInkMathConversion(latex);
          }}
          onCancel={handleCancelInkMathConversion}
        />
      ) : null}
    </div>
  );
});

export default Editor;
