import {
  defaultDocumentDisplayOptions,
  isDocumentAnswerAreaItem,
  isDocumentTaskItem,
  type DocumentItem,
  type DocumentTaskItem,
} from "@/app/lib/documentGenerator";
import {
  effectiveSelectedSubtasks,
  filterTaskDocumentBySubtasks,
} from "@/app/lib/subtaskSelection";
import type { PdfExportItem, PdfExportTaskItem } from "@/app/lib/pdf/types";
import type { PdfLayoutPage } from "@/app/lib/printLayout";
import type {
  PdfLayoutCell,
  PreviewLayoutCell,
  PreviewLayoutPage,
  PrintGridLayout,
  PrintGuideOptions,
} from "@/app/lib/printLayout";

export const SUBTASK_PER_CELL_LAYOUT: PrintGridLayout = "2x2-subtask";
export const SUBTASK_PER_CELL_COLS = 2;
export const SUBTASK_PER_CELL_ROWS = 2;

export function isSubtaskPerCellLayout(grid: PrintGridLayout): boolean {
  return grid === SUBTASK_PER_CELL_LAYOUT;
}

const EMPTY_PREVIEW_CELL: PreviewLayoutCell = {
  items: [],
  showHeader: false,
  showInstructions: false,
};

export function expandDocumentItemsToSubtaskCards(
  items: DocumentItem[],
  getAllSubtasks: (item: DocumentTaskItem) => string[]
): PreviewLayoutCell[] {
  const cards: PreviewLayoutCell[] = [];
  let pendingAnswerAreas: DocumentItem[] = [];

  function cardItems(taskItems: DocumentItem[]): DocumentItem[] {
    return [...taskItems, ...pendingAnswerAreas];
  }

  function clearPendingAnswerAreas() {
    pendingAnswerAreas = [];
  }

  for (const item of items) {
    if (isDocumentAnswerAreaItem(item)) {
      pendingAnswerAreas.push(item);
      continue;
    }

    if (!isDocumentTaskItem(item)) {
      continue;
    }

    const allSubtasks = getAllSubtasks(item);
    const selected = effectiveSelectedSubtasks(
      item.selectedSubtasks,
      allSubtasks
    );

    if (allSubtasks.length === 0 || selected.length === 0) {
      cards.push({
        items: cardItems([item]),
        showHeader: false,
        showInstructions: false,
      });
      clearPendingAnswerAreas();
      continue;
    }

    for (const label of selected) {
      cards.push({
        items: cardItems([
          {
            ...item,
            selectedSubtasks: [label],
          },
        ]),
        showHeader: false,
        showInstructions: false,
      });
    }

    clearPendingAnswerAreas();
  }

  if (pendingAnswerAreas.length > 0) {
    cards.push({
      items: [...pendingAnswerAreas],
      showHeader: false,
      showInstructions: false,
    });
  }

  return cards;
}

export type PdfSubtaskCardUnit = {
  exportItems: PdfExportItem[];
  showHeader: boolean;
  showInstructions: boolean;
};

export function expandPdfExportItemsToSubtaskCards(
  items: PdfExportItem[],
  getAllSubtasks: (item: PdfExportTaskItem) => string[]
): PdfSubtaskCardUnit[] {
  const cards: PdfSubtaskCardUnit[] = [];
  let pendingAnswerAreas: PdfExportItem[] = [];

  function cardItems(taskItems: PdfExportItem[]): PdfExportItem[] {
    return [...taskItems, ...pendingAnswerAreas];
  }

  function clearPendingAnswerAreas() {
    pendingAnswerAreas = [];
  }

  for (const item of items) {
    if (item.kind === "answer-area") {
      pendingAnswerAreas.push(item);
      continue;
    }

    if (item.kind !== "task") {
      continue;
    }

    const allSubtasks = getAllSubtasks(item);
    const selected = effectiveSelectedSubtasks(
      item.selectedSubtasks,
      allSubtasks
    );

    if (allSubtasks.length === 0 || selected.length === 0) {
      cards.push({
        exportItems: cardItems([item]),
        showHeader: false,
        showInstructions: false,
      });
      clearPendingAnswerAreas();
      continue;
    }

    for (const label of selected) {
      cards.push({
        exportItems: cardItems([
          {
            ...item,
            selectedSubtasks: [label],
          },
        ]),
        showHeader: false,
        showInstructions: false,
      });
    }

    clearPendingAnswerAreas();
  }

  if (pendingAnswerAreas.length > 0) {
    cards.push({
      exportItems: [...pendingAnswerAreas],
      showHeader: false,
      showInstructions: false,
    });
  }

  return cards;
}

export function paginatePreviewCells(
  cells: PreviewLayoutCell[],
  gridLayout: PrintGridLayout,
  cols: number,
  rows: number,
  guides: PrintGuideOptions
): PreviewLayoutPage[] {
  const pageSize = cols * rows;

  if (cells.length === 0) {
    return [
      {
        gridLayout,
        cols,
        rows,
        guides,
        cells: Array.from({ length: pageSize }, () => ({
          ...EMPTY_PREVIEW_CELL,
        })),
      },
    ];
  }

  const pages: PreviewLayoutPage[] = [];

  for (let index = 0; index < cells.length; index += pageSize) {
    const pageCells = cells.slice(index, index + pageSize);

    while (pageCells.length < pageSize) {
      pageCells.push({ ...EMPTY_PREVIEW_CELL });
    }

    pages.push({
      gridLayout,
      cols,
      rows,
      guides,
      cells: pageCells,
    });
  }

  return pages;
}

export function paginatePdfCells(
  cells: PdfLayoutCell[],
  gridLayout: PrintGridLayout,
  cols: number,
  rows: number,
  guides: PrintGuideOptions
): Extract<PdfLayoutPage, { kind: "grid" }>[] {
  const pageSize = cols * rows;
  const emptyCell = (template?: PdfLayoutCell): PdfLayoutCell => ({
    title: template?.title ?? "",
    display: template?.display ?? defaultDocumentDisplayOptions(),
    items: [],
    showHeader: false,
    showInstructions: false,
  });

  if (cells.length === 0) {
    return [
      {
        kind: "grid",
        gridLayout,
        cols,
        rows,
        guides,
        cells: Array.from({ length: pageSize }, () => emptyCell()),
      },
    ];
  }

  const pages: Extract<PdfLayoutPage, { kind: "grid" }>[] = [];

  for (let index = 0; index < cells.length; index += pageSize) {
    const pageCells = cells.slice(index, index + pageSize);

    while (pageCells.length < pageSize) {
      pageCells.push(emptyCell(pageCells[0]));
    }

    pages.push({
      kind: "grid",
      gridLayout,
      cols,
      rows,
      guides,
      cells: pageCells,
    });
  }

  return pages;
}

export function buildExportTaskNumberMap(
  items: PdfExportItem[]
): Map<string, number> {
  const map = new Map<string, number>();
  let taskNumber = 0;

  for (const item of items) {
    if (item.kind !== "task") {
      continue;
    }

    taskNumber += 1;
    map.set(item.taskId, taskNumber);
  }

  return map;
}

export function resolveSubtaskCardTaskValue(
  item: PdfExportTaskItem,
  rawValue: unknown,
  renumberSelectedSubtasks: boolean
): unknown {
  const selected = item.selectedSubtasks;

  if (!selected || selected.length === 0) {
    return rawValue;
  }

  return filterTaskDocumentBySubtasks(
    rawValue,
    selected,
    renumberSelectedSubtasks
  );
}
