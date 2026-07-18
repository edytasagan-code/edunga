"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  DEFAULT_INK_STROKE_COLOR,
  DEFAULT_INK_STROKE_WIDTH,
  clientPointToInkPointFromSvg,
  findStrokeIndexAtPoint,
  pointsToSvgPath,
} from "../core/inkStrokeUtils";
import type { ImageAlign, InkStroke } from "../types";

type Props = {
  id: string;
  width: number;
  height: number;
  strokes: InkStroke[];
  align?: ImageAlign;
  selected?: boolean;
  penMode?: boolean;
  eraserMode?: boolean;
  strokeColor?: string;
  onSelect?: (id: string) => void;
  onStrokesChange?: (id: string, strokes: InkStroke[]) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onRemove?: (id: string) => void;
  onMoveStart?: (id: string) => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
};

const MIN_WIDTH = 80;
const MIN_HEIGHT = 60;

const alignClass: Record<ImageAlign, string> = {
  left: "edunga-ink-align-left",
  center: "edunga-ink-align-center",
  right: "edunga-ink-align-right",
};

export default function InkNode({
  id,
  width,
  height,
  strokes,
  align = "left",
  selected = false,
  penMode = false,
  eraserMode = false,
  strokeColor = DEFAULT_INK_STROKE_COLOR,
  onSelect,
  onStrokesChange,
  onResize,
  onRemove,
  onMoveStart,
  onArrowLeft,
  onArrowRight,
}: Props) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [resizing, setResizing] = useState(false);
  const [liveStrokes, setLiveStrokes] = useState<InkStroke[] | null>(null);
  const liveStrokesRef = useRef<InkStroke[] | null>(null);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspect: number;
    lastWidth: number;
    lastHeight: number;
  } | null>(null);
  const drawingRef = useRef<{
    pointerId: number;
    stroke: InkStroke;
  } | null>(null);
  const erasingRef = useRef<{
    pointerId: number;
  } | null>(null);

  const displayWidth = previewSize?.width ?? width;
  const displayHeight = previewSize?.height ?? height;
  const displayStrokes = liveStrokes ?? strokes;
  const canDraw = penMode;
  const canErase = eraserMode;
  const inkInteraction = canDraw || canErase;

  const finishResize = useCallback(() => {
    const state = resizeStateRef.current;

    if (
      state &&
      (state.lastWidth !== width || state.lastHeight !== height)
    ) {
      onResize?.(id, state.lastWidth, state.lastHeight);
    }

    resizeStateRef.current = null;
    setPreviewSize(null);
    setResizing(false);
  }, [height, id, onResize, width]);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const state = resizeStateRef.current;

      if (!state) {
        return;
      }

      const deltaX = event.clientX - state.startX;
      const nextWidth = Math.max(
        MIN_WIDTH,
        Math.round(state.startWidth + deltaX)
      );
      const nextHeight = Math.max(
        MIN_HEIGHT,
        Math.round(nextWidth / state.aspect)
      );

      state.lastWidth = nextWidth;
      state.lastHeight = nextHeight;
      setPreviewSize({
        width: nextWidth,
        height: nextHeight,
      });
    };

    const handleUp = () => {
      finishResize();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [finishResize, resizing]);

  function handleResizeMouseDown(
    event: ReactMouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: width,
      startHeight: height,
      aspect: width / height,
      lastWidth: width,
      lastHeight: height,
    };

    setResizing(true);
  }

  function handleWrapperMouseDown(event: ReactMouseEvent<HTMLSpanElement>) {
    if (inkInteraction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect?.(id);
    onMoveStart?.(id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onArrowLeft?.();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onArrowRight?.();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onRemove?.(id);
    }
  }

  function setLiveStrokesState(nextStrokes: InkStroke[] | null) {
    liveStrokesRef.current = nextStrokes;
    setLiveStrokes(nextStrokes);
  }

  function commitDrawing(nextStrokes: InkStroke[]) {
    setLiveStrokesState(null);
    drawingRef.current = null;
    erasingRef.current = null;

    if (JSON.stringify(nextStrokes) !== JSON.stringify(strokes)) {
      onStrokesChange?.(id, nextStrokes);
    }
  }

  function eraseStrokeAt(clientX: number, clientY: number): boolean {
    const svg = svgRef.current;

    if (!svg) {
      return false;
    }

    const point = clientPointToInkPointFromSvg(
      svg,
      clientX,
      clientY,
      displayWidth,
      displayHeight
    );
    const currentStrokes = liveStrokesRef.current ?? strokes;
    const strokeIndex = findStrokeIndexAtPoint(currentStrokes, point);

    if (strokeIndex === -1) {
      return false;
    }

    const nextStrokes = currentStrokes.filter(
      (_, index) => index !== strokeIndex
    );
    setLiveStrokesState(nextStrokes);

    return true;
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!inkInteraction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect?.(id);

    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    if (canErase) {
      liveStrokesRef.current = strokes;
      eraseStrokeAt(event.clientX, event.clientY);
      erasingRef.current = {
        pointerId: event.pointerId,
      };
      svg.setPointerCapture(event.pointerId);
      return;
    }

    const point = clientPointToInkPointFromSvg(
      svg,
      event.clientX,
      event.clientY,
      displayWidth,
      displayHeight
    );

    const stroke: InkStroke = {
      points: [point],
      color: strokeColor,
      width: DEFAULT_INK_STROKE_WIDTH,
    };

    drawingRef.current = {
      pointerId: event.pointerId,
      stroke,
    };

    setLiveStrokesState([...strokes, stroke]);
    svg.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const erasing = erasingRef.current;

    if (erasing && erasing.pointerId === event.pointerId) {
      eraseStrokeAt(event.clientX, event.clientY);
      return;
    }

    const drawing = drawingRef.current;

    if (!drawing || drawing.pointerId !== event.pointerId) {
      return;
    }

    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const point = clientPointToInkPointFromSvg(
      svg,
      event.clientX,
      event.clientY,
      displayWidth,
      displayHeight
    );

    drawing.stroke.points.push(point);
    setLiveStrokesState([...strokes, drawing.stroke]);
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const erasing = erasingRef.current;

    if (erasing && erasing.pointerId === event.pointerId) {
      event.preventDefault();

      const svg = svgRef.current;

      if (svg?.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }

      erasingRef.current = null;
      commitDrawing(liveStrokesRef.current ?? strokes);
      return;
    }

    const drawing = drawingRef.current;

    if (!drawing || drawing.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const svg = svgRef.current;

    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    commitDrawing([...strokes, drawing.stroke]);
  }

  function handleCanvasMouseDown(event: ReactMouseEvent<SVGSVGElement>) {
    if (inkInteraction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect?.(id);
  }

  return (
    <span
      ref={wrapperRef}
      data-node-id={id}
      data-node-type="ink"
      tabIndex={selected ? 0 : -1}
      onMouseDown={handleWrapperMouseDown}
      onKeyDown={handleKeyDown}
      className={`
        edunga-ink-node
        ${alignClass[align]}
        ${selected ? "is-selected" : ""}
        ${canDraw ? "is-drawing" : ""}
        ${canErase ? "is-erasing" : ""}
      `}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        width={displayWidth}
        height={displayHeight}
        preserveAspectRatio="xMidYMid meet"
        className="edunga-ink-node__canvas"
        onPointerDown={inkInteraction ? handlePointerDown : undefined}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={handleCanvasMouseDown}
      >
        <rect
          width={displayWidth}
          height={displayHeight}
          fill="#ffffff"
          stroke="#e4e4e7"
          strokeWidth={1}
        />
        {displayStrokes.map((stroke, index) => (
          <path
            key={index}
            d={pointsToSvgPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={Math.min(stroke.width, DEFAULT_INK_STROKE_WIDTH)}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {selected && !inkInteraction ? (
        <>
          <span className="edunga-ink-node__frame" aria-hidden />
          <button
            type="button"
            aria-label="Zmień rozmiar pola odręcznego"
            className="edunga-ink-node__resize-handle"
            onMouseDown={handleResizeMouseDown}
          />
        </>
      ) : null}
    </span>
  );
}
