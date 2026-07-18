import {
  isDocumentTaskItem,
  defaultDocumentDisplayOptions,
  type DocumentDisplayOptions,
  type DocumentItem,
  type DocumentTaskItem,
  type GeneratorDocument,
} from "@/app/lib/documentGenerator";
import { pdfCellScaleKey } from "@/app/lib/printLayout/cellAutoScale";
import {
  expandDocumentItemsToSubtaskCards,
  expandPdfExportItemsToSubtaskCards,
  isSubtaskPerCellLayout,
  paginatePdfCells,
  paginatePreviewCells,
  buildExportTaskNumberMap,
  resolveSubtaskCardTaskValue,
  SUBTASK_PER_CELL_COLS,
  SUBTASK_PER_CELL_ROWS,
} from "@/app/lib/printLayout/subtaskCards";
export {
  isSubtaskPerCellLayout,
  SUBTASK_PER_CELL_LAYOUT,
} from "@/app/lib/printLayout/subtaskCards";
export {
  isSubtaskGridLayout,
  SUBTASK_GRID_LAYOUT,
} from "@/app/lib/subtaskGridLayout";
import { isSubtaskGridLayout } from "@/app/lib/subtaskGridLayout";
import { detectSubtasks } from "@/app/lib/subtaskSelection";
import type {
  PdfDocumentContentItem,
  PdfDocumentData,
  PdfExportVersion,
} from "@/app/lib/pdf/types";
import { normalizeVariants } from "@/app/lib/variants";

/** Columns × rows grid on one A4 page. */
export type PrintGridLayout =
  | "1x1"
  | "2x1"
  | "2x2"
  | "2x2-subtask"
  | "2col-subtasks"
  | "2x3"
  | "3x3";

export type PrintGuideOptions = {
  showCutLines: boolean;
  showCropMarks: boolean;
};

export type PrintLayoutOptions = {
  grid: PrintGridLayout;
  duplex: boolean;
  splitAfterTask: number;
  showCutLines: boolean;
  showCropMarks: boolean;
};

export type PdfLayoutCell = {
  title: string;
  display: DocumentDisplayOptions;
  items: PdfDocumentContentItem[];
  showHeader: boolean;
  showInstructions: boolean;
  contentScale?: number;
};

export type PdfLayoutPage =
  | { kind: "standard"; sheet: PdfDocumentData }
  | {
      kind: "grid";
      gridLayout: PrintGridLayout;
      cols: number;
      rows: number;
      cells: PdfLayoutCell[];
      guides: PrintGuideOptions;
    };

export type PreviewLayoutPage = {
  gridLayout: PrintGridLayout;
  cols: number;
  rows: number;
  cells: PreviewLayoutCell[];
  guides: PrintGuideOptions;
};

export const LAYOUT_BASE_SCALE: Record<PrintGridLayout, number> = {
  "1x1": 1,
  "2x1": 0.95,
  "2x2": 0.8,
  "2x2-subtask": 0.8,
  "2col-subtasks": 1,
  "2x3": 0.75,
  "3x3": 0.7,
};

export type PreviewLayoutCell = {
  items: DocumentItem[];
  showHeader: boolean;
  showInstructions: boolean;
};

export function getLayoutBaseScale(grid: PrintGridLayout): number {
  return LAYOUT_BASE_SCALE[grid];
}

export const PRINT_GRID_OPTIONS: Array<{
  value: PrintGridLayout;
  label: string;
}> = [
  { value: "1x1", label: "Standard (1×1)" },
  { value: "2x1", label: "2×1 (dwie kopię na kartce)" },
  { value: "2x2", label: "2×2 (cztery kopię na kartce)" },
  {
    value: "2x2-subtask",
    label: "2×2 (jeden podpunkt na kartę)",
  },
  {
    value: "2col-subtasks",
    label: "2×2 siatka podpunktów (jedno zadanie)",
  },
  { value: "2x3", label: "2×3 (sześć kopii na kartce)" },
  { value: "3x3", label: "3×3 (dziewięć mini arkuszy)" },
];

export function defaultPrintLayoutOptions(): PrintLayoutOptions {
  return {
    grid: "1x1",
    duplex: false,
    splitAfterTask: 1,
    showCutLines: true,
    showCropMarks: true,
  };
}

export function parsePrintGrid(grid: PrintGridLayout): {
  cols: number;
  rows: number;
} {
  if (isSubtaskPerCellLayout(grid)) {
    return {
      cols: SUBTASK_PER_CELL_COLS,
      rows: SUBTASK_PER_CELL_ROWS,
    };
  }

  if (isSubtaskGridLayout(grid)) {
    return { cols: 1, rows: 1 };
  }

  const [colsText, rowsText] = grid.split("x");
  return {
    cols: Number(colsText) || 1,
    rows: Number(rowsText) || 1,
  };
}

export function countDocumentTasks(items: DocumentItem[]): number {
  return items.filter(isDocumentTaskItem).length;
}

export function clampSplitAfterTask(
  splitAfterTask: number,
  taskCount: number
): number {
  if (taskCount <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, splitAfterTask), taskCount);
}

export function defaultSplitAfterTask(taskCount: number): number {
  if (taskCount <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(taskCount / 2));
}

export function usesFixedPrintLayout(printLayout: PrintLayoutOptions): boolean {
  if (isSubtaskGridLayout(printLayout.grid)) {
    return false;
  }

  return printLayout.grid !== "1x1" || printLayout.duplex;
}

export function printLayoutSummary(
  printLayout: PrintLayoutOptions,
  taskCount: number
): string {
  const normalized = normalizePrintLayout(printLayout, taskCount);
  const gridLabel =
    PRINT_GRID_OPTIONS.find((option) => option.value === normalized.grid)
      ?.label ?? normalized.grid;

  if (normalized.duplex) {
    return `${gridLabel} · duplex · podział po ${normalized.splitAfterTask}`;
  }

  return gridLabel;
}

export function normalizePrintLayout(
  printLayout: PrintLayoutOptions,
  taskCount: number
): PrintLayoutOptions {
  const grid = printLayout.grid ?? "1x1";

  return {
    grid,
    duplex:
      isSubtaskPerCellLayout(grid) || isSubtaskGridLayout(grid)
        ? false
        : Boolean(printLayout.duplex),
    splitAfterTask: clampSplitAfterTask(printLayout.splitAfterTask, taskCount),
    showCutLines: printLayout.showCutLines ?? true,
    showCropMarks: printLayout.showCropMarks ?? true,
  };
}

export type PrintLayoutTaskResolver = {
  getTaskSubtasks: (item: DocumentTaskItem) => string[];
};

export function applyMeasuredCellScales(
  pages: PdfLayoutPage[],
  measuredScales?: Record<string, number>
): PdfLayoutPage[] {
  return pages.map((page) => {
    if (page.kind !== "grid") {
      return page;
    }

    const layoutBaseScale = getLayoutBaseScale(page.gridLayout);

    return {
      ...page,
      cells: page.cells.map((cell) => {
        const key = pdfCellScaleKey(cell);
        const measuredScale = measuredScales?.[key];

        return {
          ...cell,
          contentScale: measuredScale ?? layoutBaseScale,
        };
      }),
    };
  });
}

export function splitDocumentItemsAfterTask(
  items: DocumentItem[],
  splitAfterTask: number
): { front: DocumentItem[]; back: DocumentItem[] } {
  let taskCount = 0;
  let splitIndex = items.length;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (!isDocumentTaskItem(item)) {
      continue;
    }

    taskCount += 1;

    if (taskCount === splitAfterTask) {
      splitIndex = index + 1;
      break;
    }
  }

  return {
    front: items.slice(0, splitIndex),
    back: items.slice(splitIndex),
  };
}

export function splitPdfContentAfterTask(
  items: PdfDocumentContentItem[],
  splitAfterTask: number
): { front: PdfDocumentContentItem[]; back: PdfDocumentContentItem[] } {
  let taskCount = 0;
  let splitIndex = items.length;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item.kind !== "task") {
      continue;
    }

    taskCount += 1;

    if (taskCount === splitAfterTask) {
      splitIndex = index + 1;
      break;
    }
  }

  return {
    front: items.slice(0, splitIndex),
    back: items.slice(splitIndex),
  };
}

type ContentSide = "full" | "front" | "back";

function buildPdfCell(
  sheet: PdfDocumentData,
  side: ContentSide,
  splitAfterTask: number
): PdfLayoutCell {
  if (side === "full") {
    return {
      title: sheet.title,
      display: sheet.display,
      items: sheet.items,
      showHeader: true,
      showInstructions: true,
    };
  }

  const { front, back } = splitPdfContentAfterTask(
    sheet.items,
    splitAfterTask
  );

  if (side === "front") {
    return {
      title: sheet.title,
      display: sheet.display,
      items: front,
      showHeader: true,
      showInstructions: true,
    };
  }

  return {
    title: sheet.title,
    display: sheet.display,
    items: back,
    showHeader: false,
    showInstructions: false,
  };
}

function buildPreviewCell(
  document: GeneratorDocument,
  side: ContentSide,
  splitAfterTask: number
): PreviewLayoutCell {
  if (side === "full") {
    return {
      items: document.items,
      showHeader: true,
      showInstructions: true,
    };
  }

  const { front, back } = splitDocumentItemsAfterTask(
    document.items,
    splitAfterTask
  );

  if (side === "front") {
    return {
      items: front,
      showHeader: true,
      showInstructions: true,
    };
  }

  return {
    items: back,
    showHeader: false,
    showInstructions: false,
  };
}

function buildGridCells<T extends PdfLayoutCell | PreviewLayoutCell>(
  count: number,
  buildCell: () => T
): T[] {
  return Array.from({ length: count }, () => buildCell());
}

function buildPdfGridPage(
  sheet: PdfDocumentData,
  gridLayout: PrintGridLayout,
  cols: number,
  rows: number,
  side: ContentSide,
  splitAfterTask: number,
  guides: PrintGuideOptions
): Extract<PdfLayoutPage, { kind: "grid" }> {
  const cellCount = cols * rows;

  return {
    kind: "grid",
    gridLayout,
    cols,
    rows,
    guides,
    cells: buildGridCells(cellCount, () =>
      buildPdfCell(sheet, side, splitAfterTask)
    ),
  };
}

function buildPreviewGridPage(
  document: GeneratorDocument,
  gridLayout: PrintGridLayout,
  cols: number,
  rows: number,
  side: ContentSide,
  splitAfterTask: number,
  guides: PrintGuideOptions
): PreviewLayoutPage {
  const cellCount = cols * rows;

  return {
    gridLayout,
    cols,
    rows,
    guides,
    cells: buildGridCells(cellCount, () =>
      buildPreviewCell(document, side, splitAfterTask)
    ),
  };
}

export function buildPdfLayoutPages(
  sheet: PdfDocumentData,
  printLayout: PrintLayoutOptions
): PdfLayoutPage[] {
  const normalized = normalizePrintLayout(
    printLayout,
    sheet.items.filter((item) => item.kind === "task").length
  );
  const { cols, rows } = parsePrintGrid(normalized.grid);
  const guides = {
    showCutLines: normalized.showCutLines,
    showCropMarks: normalized.showCropMarks,
  };

  if (
    (normalized.grid === "1x1" || isSubtaskGridLayout(normalized.grid)) &&
    !normalized.duplex
  ) {
    return [{ kind: "standard", sheet }];
  }

  if (isSubtaskPerCellLayout(normalized.grid)) {
    return [];
  }

  if (normalized.duplex) {
    return [
      buildPdfGridPage(
        sheet,
        normalized.grid,
        cols,
        rows,
        "front",
        normalized.splitAfterTask,
        guides
      ),
      buildPdfGridPage(
        sheet,
        normalized.grid,
        cols,
        rows,
        "back",
        normalized.splitAfterTask,
        guides
      ),
    ];
  }

  return [
    buildPdfGridPage(
      sheet,
      normalized.grid,
      cols,
      rows,
      "full",
      normalized.splitAfterTask,
      guides
    ),
  ];
}

export function buildPreviewLayoutPages(
  document: GeneratorDocument,
  taskResolver?: PrintLayoutTaskResolver
): PreviewLayoutPage[] | null {
  const normalized = normalizePrintLayout(
    document.printLayout,
    countDocumentTasks(document.items)
  );

  if (!usesFixedPrintLayout(normalized)) {
    return null;
  }

  const { cols, rows } = parsePrintGrid(normalized.grid);
  const guides = {
    showCutLines: normalized.showCutLines,
    showCropMarks: normalized.showCropMarks,
  };

  if (isSubtaskPerCellLayout(normalized.grid)) {
    if (!taskResolver) {
      return null;
    }

    const cards = expandDocumentItemsToSubtaskCards(
      document.items,
      taskResolver.getTaskSubtasks
    );

    return paginatePreviewCells(
      cards,
      normalized.grid,
      cols,
      rows,
      guides
    );
  }

  if (normalized.duplex) {
    return [
      buildPreviewGridPage(
        document,
        normalized.grid,
        cols,
        rows,
        "front",
        normalized.splitAfterTask,
        guides
      ),
      buildPreviewGridPage(
        document,
        normalized.grid,
        cols,
        rows,
        "back",
        normalized.splitAfterTask,
        guides
      ),
    ];
  }

  return [
    buildPreviewGridPage(
      document,
      normalized.grid,
      cols,
      rows,
      "full",
      normalized.splitAfterTask,
      guides
    ),
  ];
}

type PdfTaskSource = {
  warianty?: unknown;
  tresc: unknown;
};

export function buildSubtaskPerCellPdfPages(
  version: PdfExportVersion,
  printLayout: PrintLayoutOptions,
  taskMap: Map<string, PdfTaskSource>,
  title: string
): PdfLayoutPage[] {
  const taskCount = version.items.filter((item) => item.kind === "task").length;
  const normalized = normalizePrintLayout(printLayout, taskCount);
  const { cols, rows } = parsePrintGrid(normalized.grid);
  const guides = {
    showCutLines: normalized.showCutLines,
    showCropMarks: normalized.showCropMarks,
  };
  const display = {
    ...defaultDocumentDisplayOptions(),
    ...version.display,
    date: version.display?.date ?? "",
  };
  const renumberSelectedSubtasks = display.renumberSelectedSubtasks;
  const taskNumberByTaskId = buildExportTaskNumberMap(version.items);

  const cardUnits = expandPdfExportItemsToSubtaskCards(
    version.items,
    (item) => {
      const task = taskMap.get(item.taskId);

      if (!task) {
        return [];
      }

      const variants = normalizeVariants(task);
      const raw =
        variants[item.variantIndex]?.tresc ?? variants[0]?.tresc ?? null;

      return detectSubtasks(raw);
    }
  );

  const pdfCells: PdfLayoutCell[] = cardUnits.map((unit) => ({
    title,
    display,
    showHeader: unit.showHeader,
    showInstructions: unit.showInstructions,
    items: unit.exportItems.map((item) => {
      if (item.kind === "answer-area") {
        return {
          kind: "answer-area" as const,
          areaType: item.areaType,
          answerHeightPx: item.answerHeightPx,
        };
      }

      const task = taskMap.get(item.taskId);
      const variants = task ? normalizeVariants(task) : [];
      const rawValue =
        variants[item.variantIndex]?.tresc ?? variants[0]?.tresc ?? null;
      const subtaskLabel = item.selectedSubtasks?.[0];

      return {
        kind: "task" as const,
        number: taskNumberByTaskId.get(item.taskId) ?? 0,
        value: resolveSubtaskCardTaskValue(
          item,
          rawValue,
          renumberSelectedSubtasks
        ),
        subtaskLabel,
      };
    }),
  }));

  return paginatePdfCells(pdfCells, normalized.grid, cols, rows, guides);
}

export function layoutPdfPageItems(
  page: PdfLayoutPage
): PdfDocumentContentItem[] {
  if (page.kind === "standard") {
    return page.sheet.items;
  }

  return page.cells.flatMap((cell) => cell.items);
}
