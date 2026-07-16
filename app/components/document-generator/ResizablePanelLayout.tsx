"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

import "./resizable-panels.css";

const STORAGE_KEY = "edunga-generator-panel-widths";
const MIN_WIDTHS = [280, 240, 240] as const;
const DEFAULT_RATIOS: [number, number, number] = [0.38, 0.32, 0.3];
const SPLITTER_SIZE = 6;

type Props = {
  library: ReactNode;
  documentPanel: ReactNode;
  preview: ReactNode;
};

function normalizeRatios(
  ratios: [number, number, number],
  containerWidth: number
): [number, number, number] {
  const available = Math.max(
    containerWidth - SPLITTER_SIZE * 2,
    MIN_WIDTHS[0] + MIN_WIDTHS[1] + MIN_WIDTHS[2]
  );

  let left = ratios[0];
  let middle = ratios[1];
  let right = ratios[2];
  const sum = left + middle + right;

  if (sum <= 0) {
    return DEFAULT_RATIOS;
  }

  left /= sum;
  middle /= sum;
  right /= sum;

  let leftPx = left * available;
  let middlePx = middle * available;
  let rightPx = right * available;

  const clampPanel = (
    value: number,
    min: number,
    others: [number, number],
    otherMins: [number, number]
  ) => {
    const max = available - otherMins[0] - otherMins[1];
    return Math.max(min, Math.min(value, max));
  };

  leftPx = clampPanel(leftPx, MIN_WIDTHS[0], [middlePx, rightPx], [
    MIN_WIDTHS[1],
    MIN_WIDTHS[2],
  ]);
  middlePx = clampPanel(middlePx, MIN_WIDTHS[1], [leftPx, rightPx], [
    MIN_WIDTHS[0],
    MIN_WIDTHS[2],
  ]);
  rightPx = available - leftPx - middlePx;

  if (rightPx < MIN_WIDTHS[2]) {
    rightPx = MIN_WIDTHS[2];
    const remaining = available - rightPx;

    if (leftPx + middlePx > remaining) {
      const ratio = remaining / (leftPx + middlePx);
      leftPx = Math.max(MIN_WIDTHS[0], leftPx * ratio);
      middlePx = remaining - leftPx;

      if (middlePx < MIN_WIDTHS[1]) {
        middlePx = MIN_WIDTHS[1];
        leftPx = remaining - middlePx;
      }
    }
  }

  return [leftPx / available, middlePx / available, rightPx / available];
}

function loadRatios(): [number, number, number] {
  if (typeof window === "undefined") {
    return DEFAULT_RATIOS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_RATIOS;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((value) => typeof value === "number" && value > 0)
    ) {
      const sum = parsed[0] + parsed[1] + parsed[2];

      if (sum > 0) {
        return [parsed[0] / sum, parsed[1] / sum, parsed[2] / sum];
      }
    }
  } catch {
    return DEFAULT_RATIOS;
  }

  return DEFAULT_RATIOS;
}

export default function ResizablePanelLayout({
  library,
  documentPanel,
  preview,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<[number, number, number]>(DEFAULT_RATIOS);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragRef = useRef<{
    splitter: 0 | 1;
    startX: number;
    startRatios: [number, number, number];
  } | null>(null);

  useEffect(() => {
    setRatios(loadRatios());
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

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ratios));
  }, [ratios]);

  const applySplitterDrag = useCallback((splitter: 0 | 1, clientX: number) => {
    const container = containerRef.current;
    const drag = dragRef.current;

    if (!container || !drag || drag.splitter !== splitter) {
      return;
    }

    const available = container.clientWidth - SPLITTER_SIZE * 2;
    const deltaRatio = (clientX - drag.startX) / available;
    const next: [number, number, number] = [...drag.startRatios];

    if (splitter === 0) {
      next[0] += deltaRatio;
      next[1] -= deltaRatio;
    } else {
      next[1] += deltaRatio;
      next[2] -= deltaRatio;
    }

    if (next[0] <= 0 || next[1] <= 0 || next[2] <= 0) {
      return;
    }

    setRatios(normalizeRatios(next, container.clientWidth));
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.document.body.classList.remove("resizable-panels--dragging");
  }, []);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;

      if (!drag) {
        return;
      }

      applySplitterDrag(drag.splitter, event.clientX);
    }

    function onPointerUp() {
      endDrag();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [applySplitterDrag, endDrag]);

  function startDrag(splitter: 0 | 1) {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragRef.current = {
        splitter,
        startX: event.clientX,
        startRatios: ratios,
      };
      window.document.body.classList.add("resizable-panels--dragging");
      event.currentTarget.setPointerCapture(event.pointerId);
    };
  }

  const availableWidth = Math.max(
    containerWidth - SPLITTER_SIZE * 2,
    MIN_WIDTHS[0] + MIN_WIDTHS[1] + MIN_WIDTHS[2]
  );
  const normalized = normalizeRatios(ratios, containerWidth || 1200);
  const leftWidth = normalized[0] * availableWidth;
  const middleWidth = normalized[1] * availableWidth;

  return (
    <div ref={containerRef} className="resizable-panels flex h-full min-h-0 w-full">
      <div
        className="resizable-panels__panel flex min-h-0 flex-col overflow-hidden"
        style={{ width: leftWidth, minWidth: MIN_WIDTHS[0] }}
      >
        {library}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Zmień szerokość paneli"
        className="resizable-panels__splitter"
        onPointerDown={startDrag(0)}
      />

      <div
        className="resizable-panels__panel flex min-h-0 flex-col overflow-hidden"
        style={{ width: middleWidth, minWidth: MIN_WIDTHS[1] }}
      >
        {documentPanel}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Zmień szerokość paneli"
        className="resizable-panels__splitter"
        onPointerDown={startDrag(1)}
      />

      <div
        className="resizable-panels__panel flex min-h-0 min-w-[240px] flex-1 flex-col overflow-hidden"
        style={{ minWidth: MIN_WIDTHS[2] }}
      >
        {preview}
      </div>
    </div>
  );
}
