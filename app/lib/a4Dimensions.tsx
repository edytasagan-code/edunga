"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export type A4Dimensions = {
  widthPx: number;
  heightPx: number;
};

const FALLBACK_A4: A4Dimensions = {
  widthPx: (210 * 96) / 25.4,
  heightPx: (297 * 96) / 25.4,
};

export function useA4Dimensions(): A4Dimensions & {
  probeRef: RefObject<HTMLDivElement | null>;
} {
  const probeRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<A4Dimensions>(FALLBACK_A4);

  useLayoutEffect(() => {
    const probe = probeRef.current;

    if (!probe) {
      return;
    }

    const rect = probe.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      setDimensions({
        widthPx: rect.width,
        heightPx: rect.height,
      });
    }
  }, []);

  return { ...dimensions, probeRef };
}

export function A4DimensionProbe({
  probeRef,
}: {
  probeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={probeRef}
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 h-[297mm] w-[210mm]"
    />
  );
}
