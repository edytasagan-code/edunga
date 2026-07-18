import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import type { EditorDocument, Paragraph } from "@/app/components/editor/types";
import { pxToAnswerAreaPt } from "@/app/lib/answerAreaStyle";
import { extractParagraphSubtaskLabel } from "@/app/lib/subtaskSelection";
import type { PrintGridLayout } from "@/app/lib/printLayout";

export const SUBTASK_GRID_LAYOUT: PrintGridLayout = "2col-subtasks";
export const SUBTASK_GRID_MIN_COUNT = 2;
export const SUBTASK_GRID_COLUMN_COUNT = 2;
/** Space below each subtask for pupil work (preview px / PDF pt). */
export const SUBTASK_GRID_WORKSPACE_HEIGHT_PX = 72;
export const SUBTASK_GRID_WORKSPACE_HEIGHT_PT = 54;
/** Default vertical gap between stacked blocks in the same column. */
export const SUBTASK_GRID_BLOCK_GAP_PX = 16;
export const SUBTASK_GRID_MAX_OFFSET_PX = 480;

export type SubtaskGridOffsets = Record<string, number>;

export type SubtaskGridSplit = {
  instruction: EditorDocument;
  subtasks: Paragraph[];
};

export function isSubtaskGridLayout(grid: PrintGridLayout): boolean {
  return grid === SUBTASK_GRID_LAYOUT;
}

export function getParagraphSubtaskLabel(paragraph: Paragraph): string | null {
  return extractParagraphSubtaskLabel(paragraph);
}

export function splitDocumentForSubtaskGrid(
  value: unknown
): SubtaskGridSplit | null {
  const document = parseEditorDocument(value);

  if (!document) {
    return null;
  }

  const instruction: Paragraph[] = [];
  const subtasks: Paragraph[] = [];

  for (const paragraph of document.paragraphs) {
    const label = extractParagraphSubtaskLabel(paragraph);

    if (label) {
      subtasks.push(paragraph);
    } else {
      instruction.push(paragraph);
    }
  }

  if (subtasks.length < SUBTASK_GRID_MIN_COUNT) {
    return null;
  }

  return {
    instruction: {
      ...document,
      paragraphs: instruction,
    },
    subtasks,
  };
}

export function partitionSubtasksIntoColumns(subtasks: Paragraph[]): {
  left: Paragraph[];
  right: Paragraph[];
} {
  const left: Paragraph[] = [];
  const right: Paragraph[] = [];

  for (let index = 0; index < subtasks.length; index += 1) {
    if (index % 2 === 0) {
      left.push(subtasks[index]);
    } else {
      right.push(subtasks[index]);
    }
  }

  return { left, right };
}

export function chunkSubtasksIntoGridRows(
  subtasks: Paragraph[],
  columnCount = SUBTASK_GRID_COLUMN_COUNT
): Paragraph[][] {
  const rows: Paragraph[][] = [];

  for (let index = 0; index < subtasks.length; index += columnCount) {
    rows.push(subtasks.slice(index, index + columnCount));
  }

  return rows;
}

export function clampSubtaskGridOffsetPx(value: number): number {
  return Math.max(
    0,
    Math.min(SUBTASK_GRID_MAX_OFFSET_PX, Math.round(value))
  );
}

export function resolveSubtaskBlockMarginTopPx(
  blockIndexInColumn: number,
  label: string,
  offsets: SubtaskGridOffsets | undefined
): number {
  const extra = offsets?.[label] ?? 0;

  if (blockIndexInColumn === 0) {
    return extra;
  }

  return SUBTASK_GRID_BLOCK_GAP_PX + extra;
}

export function previewPxToDocumentPt(px: number, contentScale = 1): number {
  return pxToAnswerAreaPt(Math.max(0, Math.round(px))) * contentScale;
}

export function subtaskGridOffsetPxToPt(
  offsetPx: number,
  contentScale = 1
): number {
  return previewPxToDocumentPt(
    clampSubtaskGridOffsetPx(offsetPx),
    contentScale
  );
}

export function resolveSubtaskBlockMarginTopPt(
  blockIndexInColumn: number,
  label: string,
  offsets: SubtaskGridOffsets | undefined,
  contentScale = 1
): number {
  return previewPxToDocumentPt(
    resolveSubtaskBlockMarginTopPx(blockIndexInColumn, label, offsets),
    contentScale
  );
}

export function normalizeSubtaskGridOffsets(
  offsets: SubtaskGridOffsets | undefined,
  validLabels: string[]
): SubtaskGridOffsets | undefined {
  if (!offsets) {
    return undefined;
  }

  const allowed = new Set(validLabels.map((label) => label.toLowerCase()));
  const normalized: SubtaskGridOffsets = {};

  for (const [label, value] of Object.entries(offsets)) {
    const key = label.toLowerCase();

    if (!allowed.has(key)) {
      continue;
    }

    const clamped = clampSubtaskGridOffsetPx(value);

    if (clamped > 0) {
      normalized[key] = clamped;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function patchSubtaskGridOffset(
  offsets: SubtaskGridOffsets | undefined,
  label: string,
  offsetPx: number,
  validLabels: string[]
): SubtaskGridOffsets | undefined {
  const next = { ...(offsets ?? {}) };
  const key = label.toLowerCase();
  const clamped = clampSubtaskGridOffsetPx(offsetPx);

  if (clamped === 0) {
    delete next[key];
  } else {
    next[key] = clamped;
  }

  return normalizeSubtaskGridOffsets(next, validLabels);
}

export function collectSubtaskLabels(subtasks: Paragraph[]): string[] {
  const labels: string[] = [];

  for (const paragraph of subtasks) {
    const label = getParagraphSubtaskLabel(paragraph);

    if (label) {
      labels.push(label);
    }
  }

  return labels;
}

export function shouldUseSubtaskGridLayout(
  value: unknown,
  layoutEnabled: boolean
): boolean {
  if (!layoutEnabled) {
    return false;
  }

  return splitDocumentForSubtaskGrid(value) !== null;
}
