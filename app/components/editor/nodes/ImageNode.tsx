"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { ImageAlign } from "../types";

type Props = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  align?: ImageAlign;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onRemove?: (id: string) => void;
  onMoveStart?: (id: string) => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
};

const MIN_WIDTH = 40;
const MIN_HEIGHT = 40;

const alignClass: Record<ImageAlign, string> = {
  left: "edunga-image-align-left",
  center: "edunga-image-align-center",
  right: "edunga-image-align-right",
};

export default function ImageNode({
  id,
  src,
  width,
  height,
  alt,
  align = "left",
  selected = false,
  onSelect,
  onResize,
  onRemove,
  onMoveStart,
  onArrowLeft,
  onArrowRight,
}: Props) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [resizing, setResizing] = useState(false);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspect: number;
    lastWidth: number;
    lastHeight: number;
  } | null>(null);

  const displayWidth = previewSize?.width ?? width;
  const displayHeight = previewSize?.height ?? height;

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
  }, [finishResize, id, onResize, resizing]);

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

  function handleMouseDown(event: ReactMouseEvent<HTMLSpanElement>) {
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

  return (
    <span
      ref={wrapperRef}
      data-node-id={id}
      data-node-type="image"
      tabIndex={selected ? 0 : -1}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      className={`
        edunga-image-node
        ${alignClass[align]}
        ${selected ? "is-selected" : ""}
      `}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "Ilustracja"}
        width={displayWidth}
        height={displayHeight}
        draggable={false}
        className="edunga-image-node__img"
      />

      {selected ? (
        <>
          <span className="edunga-image-node__frame" aria-hidden />
          <button
            type="button"
            aria-label="Zmień rozmiar obrazu"
            className="edunga-image-node__resize-handle"
            onMouseDown={handleResizeMouseDown}
          />
        </>
      ) : null}
    </span>
  );
}
