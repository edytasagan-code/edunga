"use client";

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

import { resolveCellContentScale } from "@/app/lib/printLayout/cellAutoScale";

import { usePrintCellScale } from "./PrintCellScaleContext";

type MeasureProps = {
  cellKey: string;
  layoutBaseScale: number;
  availableWidth: number;
  availableHeight: number;
  children: ReactNode;
};

export function MeasureGridCell({
  cellKey,
  layoutBaseScale,
  availableWidth,
  availableHeight,
  children,
}: MeasureProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const printCellScale = usePrintCellScale();

  useLayoutEffect(() => {
    const measureEl = measureRef.current;

    if (!measureEl || availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const nextScale = resolveCellContentScale(
      layoutBaseScale,
      measureEl.scrollWidth,
      measureEl.scrollHeight,
      availableWidth,
      availableHeight
    );

    printCellScale?.registerCellScale(cellKey, nextScale);
  }, [
    availableWidth,
    availableHeight,
    cellKey,
    children,
    layoutBaseScale,
    printCellScale,
  ]);

  return (
    <div aria-hidden className="document-preview-cell-measure">
      <div
        ref={measureRef}
        className="document-preview-cell-measure-inner"
        style={{
          width: availableWidth,
          fontSize: `${layoutBaseScale}rem`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type DisplayProps = {
  cellKey: string;
  layoutBaseScale: number;
  availableWidth: number;
  availableHeight: number;
  children: ReactNode;
};

export function ScaledGridCell({
  cellKey,
  layoutBaseScale,
  availableWidth,
  availableHeight,
  children,
}: DisplayProps) {
  const printCellScale = usePrintCellScale();
  const finalScale = printCellScale?.getCellScales().get(cellKey)?.scale ?? layoutBaseScale;
  const fitMultiplier =
    layoutBaseScale > 0 ? finalScale / layoutBaseScale : finalScale;
  const inverseFit = fitMultiplier > 0 ? 1 / fitMultiplier : 1;

  return (
    <div
      className="document-preview-cell-viewport"
      style={{
        width: availableWidth,
        height: availableHeight,
      }}
    >
      <div
        className="document-preview-cell-scaled"
        style={{
          transform: `scale(${fitMultiplier})`,
          transformOrigin: "top left",
          width: availableWidth * inverseFit,
          fontSize: `${layoutBaseScale}rem`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
