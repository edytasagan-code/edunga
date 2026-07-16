"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import "./editor-split-layout.css";

const STORAGE_KEY = "edunga-editor-split-ratio";
const MIN_LEFT = 320;
const MIN_RIGHT = 240;
const DEFAULT_RATIO = 0.58;
const SPLITTER_SIZE = 6;

type Props = {
  editor: ReactNode;
  preview: ReactNode;
  outline?: ReactNode;
  showOutline?: boolean;
};

function loadRatio(): number {
  if (typeof window === "undefined") {
    return DEFAULT_RATIO;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseFloat(raw) : NaN;

    if (Number.isFinite(parsed) && parsed > 0.2 && parsed < 0.85) {
      return parsed;
    }
  } catch {
    return DEFAULT_RATIO;
  }

  return DEFAULT_RATIO;
}

export default function EditorSplitLayout({
  editor,
  preview,
  outline,
  showOutline = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragRef = useRef<{ startX: number; startRatio: number } | null>(
    null
  );

  useEffect(() => {
    setRatio(loadRatio());
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      const container = containerRef.current;

      if (!drag || !container) {
        return;
      }

      const available = container.clientWidth - SPLITTER_SIZE;
      const deltaRatio = (event.clientX - drag.startX) / available;
      const next = Math.max(
        MIN_LEFT / available,
        Math.min(0.85, drag.startRatio + deltaRatio)
      );

      setRatio(next);
    }

    function onPointerUp() {
      dragRef.current = null;
      window.document.body.classList.remove(
        "edunga-editor-split--dragging"
      );
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const availableWidth = Math.max(
    containerWidth - SPLITTER_SIZE,
    MIN_LEFT + MIN_RIGHT
  );
  const leftWidth = useMemo(() => {
    const width = ratio * availableWidth;
    return Math.max(MIN_LEFT, Math.min(width, availableWidth - MIN_RIGHT));
  }, [availableWidth, ratio]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragRef.current = {
      startX: event.clientX,
      startRatio: ratio,
    };
    window.document.body.classList.add("edunga-editor-split--dragging");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return (
    <div ref={containerRef} className="edunga-editor-split">
      {showOutline && outline ? (
        <aside className="edunga-editor-split__outline">{outline}</aside>
      ) : null}

      <div
        className="edunga-editor-split__editor"
        style={{ width: leftWidth, minWidth: MIN_LEFT }}
      >
        {editor}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Zmień szerokość podglądu"
        className="edunga-editor-split__splitter"
        onPointerDown={startDrag}
      />

      <div className="edunga-editor-split__preview">{preview}</div>
    </div>
  );
}
