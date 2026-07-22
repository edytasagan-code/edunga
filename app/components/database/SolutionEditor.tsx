"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import Editor, {
  type EditorHandle,
  type EditorToolbarTarget,
} from "../editor/Editor";
import {
  DEFAULT_INK_HEIGHT,
  DEFAULT_INK_WIDTH,
} from "../editor/core/inkStrokeUtils";
import { EditorDocument } from "../editor/types";

type Props = {
  value: EditorDocument;
  onChange: (document: EditorDocument) => void;
  onActivate?: (target: EditorToolbarTarget) => void;
  /** Shared editor toolbar — shown inside the floating window. */
  toolbar?: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
};

type WindowPos = { left: number; top: number };
type WindowSize = { width: number; height: number };

const WINDOW_PAD_X = 28;
const WINDOW_HEADER_H = 48;
const WINDOW_TOOLBAR_H = 72;
const WINDOW_PAD_Y = 20;
const WINDOW_CONTENT_SCALE = 2.5;
const MIN_WINDOW_W = 520;
const MIN_WINDOW_H = 400;

function getPrimaryInkSize(doc: EditorDocument): {
  width: number;
  height: number;
} {
  for (const paragraph of doc.paragraphs) {
    for (const child of paragraph.children) {
      if (child.type === "ink") {
        return { width: child.width, height: child.height };
      }
    }
  }

  return { width: DEFAULT_INK_WIDTH, height: DEFAULT_INK_HEIGHT };
}

function computeWindowSize(
  doc: EditorDocument,
  hasToolbar: boolean
): WindowSize {
  const ink = getPrimaryInkSize(doc);
  const chromeY =
    WINDOW_HEADER_H + (hasToolbar ? WINDOW_TOOLBAR_H : 0) + WINDOW_PAD_Y;
  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.95;

  return clampWindowSize({
    width: Math.round((ink.width + WINDOW_PAD_X) * WINDOW_CONTENT_SCALE),
    height: Math.round((ink.height + chromeY) * WINDOW_CONTENT_SCALE),
  });
}

function clampWindowSize(size: WindowSize): WindowSize {
  if (typeof window === "undefined") {
    return size;
  }

  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.95;

  return {
    width: Math.min(Math.max(MIN_WINDOW_W, size.width), maxW),
    height: Math.min(Math.max(MIN_WINDOW_H, size.height), maxH),
  };
}

function centeredWindowPos(size: WindowSize): WindowPos {
  return {
    left: Math.max(0, (window.innerWidth - size.width) / 2),
    top: Math.max(0, (window.innerHeight - size.height) / 2),
  };
}

function clampWindowPos(pos: WindowPos, size: WindowSize): WindowPos {
  const maxLeft = Math.max(0, window.innerWidth - size.width);
  const maxTop = Math.max(0, window.innerHeight - size.height);
  return {
    left: Math.min(Math.max(0, pos.left), maxLeft),
    top: Math.min(Math.max(0, pos.top), maxTop),
  };
}

const SolutionEditor = forwardRef<EditorHandle, Props>(
  function SolutionEditor(
    { value, onChange, onActivate, toolbar, onExpandedChange },
    ref
  ) {
    const [expanded, setExpanded] = useState(false);
    const [windowPos, setWindowPos] = useState<WindowPos>({ left: 0, top: 0 });
    const [windowSize, setWindowSize] = useState<WindowSize>({
      width: MIN_WINDOW_W,
      height: MIN_WINDOW_H,
    });
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      originLeft: number;
      originTop: number;
    } | null>(null);
    const resizeRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      originWidth: number;
      originHeight: number;
    } | null>(null);

    const hasToolbar = Boolean(toolbar);

    const setExpandedState = useCallback(
      (next: boolean) => {
        setExpanded(next);
        onExpandedChange?.(next);
      },
      [onExpandedChange]
    );

    const openExpanded = useCallback(() => {
      const size = computeWindowSize(value, hasToolbar);
      setWindowSize(size);
      setWindowPos(centeredWindowPos(size));
      setExpandedState(true);
    }, [hasToolbar, setExpandedState, value]);

    const closeExpanded = useCallback(() => {
      setExpandedState(false);
      dragRef.current = null;
      resizeRef.current = null;
    }, [setExpandedState]);

    useEffect(() => {
      if (!expanded) {
        return;
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          closeExpanded();
        }
      }

      function onViewportResize() {
        setWindowSize((size) => {
          const nextSize = clampWindowSize(size);
          setWindowPos((pos) => clampWindowPos(pos, nextSize));
          return nextSize;
        });
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onViewportResize);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onViewportResize);
      };
    }, [closeExpanded, expanded]);

    const handlePanelClick = useCallback(
      (event: ReactMouseEvent) => {
        if (expanded) {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest("button")) {
          return;
        }

        openExpanded();
      },
      [expanded, openExpanded]
    );

    const handleDragPointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!expanded) {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest("button")) {
          return;
        }

        event.preventDefault();
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originLeft: windowPos.left,
          originTop: windowPos.top,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [expanded, windowPos.left, windowPos.top]
    );

    const handleDragPointerMove = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }

        setWindowPos(
          clampWindowPos(
            {
              left: drag.originLeft + (event.clientX - drag.startX),
              top: drag.originTop + (event.clientY - drag.startY),
            },
            windowSize
          )
        );
      },
      [windowSize]
    );

    const handleDragPointerUp = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }

        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      []
    );

    const handleResizePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!expanded) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        resizeRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originWidth: windowSize.width,
          originHeight: windowSize.height,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [expanded, windowSize.height, windowSize.width]
    );

    const handleResizePointerMove = useCallback(
      (event: ReactPointerEvent<HTMLButtonElement>) => {
        const resize = resizeRef.current;
        if (!resize || resize.pointerId !== event.pointerId) {
          return;
        }

        const nextSize = clampWindowSize({
          width: resize.originWidth + (event.clientX - resize.startX),
          height: resize.originHeight + (event.clientY - resize.startY),
        });

        setWindowSize(nextSize);
        setWindowPos((pos) => clampWindowPos(pos, nextSize));
      },
      []
    );

    const handleResizePointerUp = useCallback(
      (event: ReactPointerEvent<HTMLButtonElement>) => {
        const resize = resizeRef.current;
        if (!resize || resize.pointerId !== event.pointerId) {
          return;
        }

        resizeRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      []
    );

    return (
      <>
        {expanded ? (
          <div
            className="task-editor-workspace__solution-placeholder"
            aria-hidden
          >
            <p className="task-editor-section__title">Rozwiązanie</p>
            <p className="task-editor-workspace__solution-placeholder-hint">
              Otwarte w osobnym oknie
            </p>
          </div>
        ) : null}

        <div
          className={`task-editor-workspace__solution${
            expanded ? " task-editor-workspace__solution--expanded" : ""
          }`}
          style={
            expanded
              ? {
                  left: windowPos.left,
                  top: windowPos.top,
                  width: windowSize.width,
                  height: windowSize.height,
                }
              : undefined
          }
          onClick={handlePanelClick}
        >
          <div
            className={`task-editor-solution__header${
              expanded ? " task-editor-solution__header--draggable" : ""
            }`}
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
          >
            <h2 className="task-editor-section__title">Rozwiązanie</h2>
            {expanded ? (
              <button
                type="button"
                className="task-editor-solution__expand"
                onClick={closeExpanded}
                title="Zamknij okno (Esc)"
              >
                Zamknij
              </button>
            ) : (
              <button
                type="button"
                className="task-editor-solution__expand"
                onClick={(event) => {
                  event.stopPropagation();
                  openExpanded();
                }}
                title="Otwórz rozwiązanie w osobnym oknie"
              >
                Powiększ
              </button>
            )}
          </div>

          {expanded && toolbar ? (
            <div className="task-editor-solution__toolbar">{toolbar}</div>
          ) : null}

          <div className="task-editor-solution__editor" role="presentation">
            <Editor
              ref={ref}
              sessionId="rozwiazanie"
              value={value}
              onChange={onChange}
              hideToolbar
              layout="secondary"
              onActivate={onActivate}
              className={
                expanded ? "edunga-editor--solution-window" : ""
              }
            />
          </div>

          {expanded ? (
            <button
              type="button"
              className="task-editor-solution__resize-handle"
              aria-label="Zmień rozmiar okna"
              title="Przeciągnij, aby zmienić rozmiar"
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
            />
          ) : null}
        </div>
      </>
    );
  }
);

export default SolutionEditor;
