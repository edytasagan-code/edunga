export const MIN_READABLE_CELL_SCALE = 0.55;

export const CELL_LAYOUT_TOO_LARGE_MESSAGE =
  "This quiz is too large for the selected layout.";

export type CellFitScaleResult = {
  scale: number;
  tooLarge: boolean;
};

export function computeCellFitScale(
  naturalWidth: number,
  naturalHeight: number,
  availableWidth: number,
  availableHeight: number,
  maxScale = 1
): CellFitScaleResult {
  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return { scale: maxScale, tooLarge: false };
  }

  const widthScale = availableWidth / naturalWidth;
  const heightScale = availableHeight / naturalHeight;
  let fitMultiplier = Math.min(widthScale, heightScale, maxScale);

  if (!Number.isFinite(fitMultiplier) || fitMultiplier <= 0) {
    fitMultiplier = maxScale;
  }

  return { scale: fitMultiplier, tooLarge: false };
}

export function resolveCellContentScale(
  layoutBaseScale: number,
  naturalWidth: number,
  naturalHeight: number,
  availableWidth: number,
  availableHeight: number
): CellFitScaleResult {
  const fit = computeCellFitScale(
    naturalWidth,
    naturalHeight,
    availableWidth,
    availableHeight
  );
  const scale = layoutBaseScale * fit.scale;

  if (scale < MIN_READABLE_CELL_SCALE) {
    return {
      scale: MIN_READABLE_CELL_SCALE,
      tooLarge: true,
    };
  }

  return {
    scale,
    tooLarge: false,
  };
}

/** Preview padding ratio — matches PDF grid cell padding (0.75 × page padding). */
export const CELL_PADDING_SCALE = 0.75;

export function computeAvailableCellSizePx(
  pageWidthPx: number,
  pageHeightPx: number,
  cols: number,
  rows: number,
  pagePaddingHPx: number,
  pagePaddingVPx: number
): { width: number; height: number } {
  const cellWidth = pageWidthPx / cols;
  const cellHeight = pageHeightPx / rows;
  const paddingH = pagePaddingHPx * CELL_PADDING_SCALE;
  const paddingV = pagePaddingVPx * CELL_PADDING_SCALE;

  return {
    width: Math.max(0, cellWidth - paddingH * 2),
    height: Math.max(0, cellHeight - paddingV - paddingV * 0.5),
  };
}

export function computeAvailableCellSizePt(
  pageWidthPt: number,
  pageHeightPt: number,
  cols: number,
  rows: number,
  pagePaddingHPt: number,
  pagePaddingVPt: number
): { width: number; height: number } {
  const cellWidth = pageWidthPt / cols;
  const cellHeight = pageHeightPt / rows;
  const paddingH = pagePaddingHPt * CELL_PADDING_SCALE;
  const paddingV = pagePaddingVPt * CELL_PADDING_SCALE;

  return {
    width: Math.max(0, cellWidth - paddingH * 2),
    height: Math.max(0, cellHeight - paddingV - paddingV * 0.5),
  };
}

export function cellScaleKey(input: {
  itemSignatures: string[];
  showHeader: boolean;
  showInstructions: boolean;
}): string {
  return [
    input.showHeader ? "h1" : "h0",
    input.showInstructions ? "i1" : "i0",
    ...input.itemSignatures,
  ].join("|");
}

export function previewCellScaleKey(
  cell: {
    items: Array<{
      kind?: string;
      entryId?: string;
      areaType?: string;
      selectedSubtasks?: string[];
    }>;
    showHeader: boolean;
    showInstructions: boolean;
  },
  taskNumberByEntryId: Map<string, number>
): string {
  const itemSignatures = cell.items.map((item, index) => {
    if (item.kind === "task" && item.entryId) {
      const subtaskSuffix =
        item.selectedSubtasks?.length === 1
          ? `:${item.selectedSubtasks[0]}`
          : "";

      return `t:${taskNumberByEntryId.get(item.entryId) ?? index + 1}${subtaskSuffix}`;
    }

    if (item.kind === "answer-area") {
      return `a:${index}:${item.areaType ?? "blank"}`;
    }

    return `x:${index}`;
  });

  return cellScaleKey({
    itemSignatures,
    showHeader: cell.showHeader,
    showInstructions: cell.showInstructions,
  });
}

export function pdfCellScaleKey(cell: {
  items: Array<{
    kind: string;
    number?: number;
    areaType?: string;
    subtaskLabel?: string;
  }>;
  showHeader: boolean;
  showInstructions: boolean;
}): string {
  const itemSignatures = cell.items.map((item, index) => {
    if (item.kind === "task") {
      const subtaskSuffix = item.subtaskLabel ? `:${item.subtaskLabel}` : "";

      return `t:${item.number ?? index + 1}${subtaskSuffix}`;
    }

    if (item.kind === "answer-area") {
      return `a:${index}:${item.areaType ?? "blank"}`;
    }

    return `x:${index}`;
  });

  return cellScaleKey({
    itemSignatures,
    showHeader: cell.showHeader,
    showInstructions: cell.showInstructions,
  });
}
