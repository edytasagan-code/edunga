"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { A4Dimensions } from "@/app/lib/a4Dimensions";

type Props = {
  children: ReactNode;
  pageSize: A4Dimensions;
};

export default function A4PreviewScaler({ children, pageSize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const stack = stackRef.current;

    if (!container || !stack) {
      return;
    }

    function updateScale() {
      const containerEl = containerRef.current;
      const stackEl = stackRef.current;

      if (!containerEl || !stackEl) {
        return;
      }

      const availableWidth = containerEl.getBoundingClientRect().width;
      const naturalWidth = pageSize.widthPx;
      const naturalHeight = stackEl.offsetHeight;

      if (availableWidth <= 0 || naturalWidth <= 0) {
        return;
      }

      const nextScale = availableWidth / naturalWidth;
      setScale(nextScale);
      setFrameHeight(naturalHeight * nextScale);
    }

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(stack);
    updateScale();

    return () => observer.disconnect();
  }, [pageSize.widthPx, pageSize.heightPx, children]);

  const scaledWidth = pageSize.widthPx * scale;

  return (
    <div ref={containerRef} className="document-preview-scaler">
      <div
        className="document-preview-scaler__frame"
        style={{
          width: scaledWidth > 0 ? scaledWidth : "100%",
          height: frameHeight > 0 ? frameHeight : undefined,
        }}
      >
        <div
          ref={stackRef}
          className="document-preview-scaler__stack"
          style={{
            width: pageSize.widthPx,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
