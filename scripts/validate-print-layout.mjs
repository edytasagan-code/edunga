import {
  CELL_LAYOUT_TOO_LARGE_MESSAGE,
  computeCellFitScale,
  MIN_READABLE_CELL_SCALE,
  resolveCellContentScale,
} from "../app/lib/printLayout/cellAutoScale.ts";
import {
  countDocumentTasks,
  buildPdfLayoutPages,
  buildPreviewLayoutPages,
  splitDocumentItemsAfterTask,
  splitPdfContentAfterTask,
  defaultPrintLayoutOptions,
  parsePrintGrid,
  applyMeasuredCellScales,
  getLayoutBaseScale,
  LAYOUT_BASE_SCALE,
  normalizePrintLayout,
} from "../app/lib/printLayout.ts";
import {
  expandDocumentItemsToSubtaskCards,
  isSubtaskPerCellLayout,
} from "../app/lib/printLayout/subtaskCards.ts";
import {
  isSubtaskGridLayout,
  partitionSubtasksIntoColumns,
  chunkSubtasksIntoGridRows,
  splitDocumentForSubtaskGrid,
  resolveSubtaskBlockMarginTopPx,
  normalizeSubtaskGridOffsets,
  patchSubtaskGridOffset,
} from "../app/lib/subtaskGridLayout.ts";

import {
  createDocumentTaskItem,
  defaultDocumentDisplayOptions,
} from "../app/lib/documentGenerator.ts";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const items = Array.from({ length: 6 }, (_, index) =>
  createDocumentTaskItem(`task-${index + 1}`, 0)
);

const document = {
  title: "Quiz",
  type: "quiz",
  display: defaultDocumentDisplayOptions(),
  printLayout: {
    grid: "2x3",
    duplex: true,
    splitAfterTask: 3,
    showCutLines: true,
    showCropMarks: true,
  },
  items,
};

check("task count", countDocumentTasks(items) === 6);
check("2x3 grid", parsePrintGrid("2x3").cols === 2 && parsePrintGrid("2x3").rows === 3);

const split = splitDocumentItemsAfterTask(items, 3);
check("front split has 3 tasks", countDocumentTasks(split.front) === 3);
check("back split has 3 tasks", countDocumentTasks(split.back) === 3);

const pdfSplit = splitPdfContentAfterTask(
  [
    { kind: "task", number: 1, value: null },
    { kind: "task", number: 2, value: null },
    { kind: "task", number: 3, value: null },
    { kind: "task", number: 4, value: null },
  ],
  2
);
check("pdf split front tasks", pdfSplit.front.length === 2);
check("pdf split back tasks", pdfSplit.back.length === 2);

const previewPages = buildPreviewLayoutPages(document);
check("duplex 2x3 preview has 2 pages", previewPages?.length === 2);
check(
  "preview page 1 has 6 cells",
  previewPages?.[0]?.cells.length === 6
);
check(
  "preview page 1 front tasks in each cell",
  countDocumentTasks(previewPages?.[0]?.cells[0]?.items ?? []) === 3
);
check(
  "preview page 2 back tasks in each cell",
  countDocumentTasks(previewPages?.[1]?.cells[0]?.items ?? []) === 3
);
check("preview page 1 shows header", previewPages?.[0]?.cells[0]?.showHeader === true);
check("preview page 2 hides header", previewPages?.[1]?.cells[0]?.showHeader === false);

const pdfPages = buildPdfLayoutPages(
  {
    title: "Quiz",
    display: defaultDocumentDisplayOptions(),
    items: Array.from({ length: 6 }, (_, index) => ({
      kind: "task",
      number: index + 1,
      value: null,
    })),
  },
  document.printLayout
);
check("duplex 2x3 pdf has 2 pages", pdfPages.length === 2);
check("pdf page 1 is grid", pdfPages[0]?.kind === "grid");
check(
  "pdf page 1 grid is 2x3",
  pdfPages[0]?.kind === "grid" &&
    pdfPages[0].cols === 2 &&
    pdfPages[0].rows === 3 &&
    pdfPages[0].cells.length === 6
);
check(
  "pdf front cell has 3 tasks",
  pdfPages[0]?.kind === "grid" &&
    pdfPages[0].cells[0].items.filter((item) => item.kind === "task").length === 3
);

const singleSidedPages = buildPdfLayoutPages(
  {
    title: "Worksheet",
    display: defaultDocumentDisplayOptions(),
    items: [{ kind: "task", number: 1, value: null }],
  },
  {
    grid: "2x1",
    duplex: false,
    splitAfterTask: 1,
    showCutLines: true,
    showCropMarks: false,
  }
);
check("2x1 single-sided is one grid page", singleSidedPages.length === 1);
check(
  "2x1 single-sided has two cells",
  singleSidedPages[0]?.kind === "grid" && singleSidedPages[0].cells.length === 2
);

const standardPages = buildPdfLayoutPages(
  {
    title: "Test",
    display: defaultDocumentDisplayOptions(),
    items: [{ kind: "task", number: 1, value: null }],
  },
  defaultPrintLayoutOptions()
);
check("standard 1x1 is one standard page", standardPages.length === 1);
check("standard page kind", standardPages[0]?.kind === "standard");

const duplex1x1Pages = buildPdfLayoutPages(
  {
    title: "Quiz",
    display: defaultDocumentDisplayOptions(),
    items: Array.from({ length: 4 }, (_, index) => ({
      kind: "task",
      number: index + 1,
      value: null,
    })),
  },
  {
    grid: "1x1",
    duplex: true,
    splitAfterTask: 2,
    showCutLines: false,
    showCropMarks: false,
  }
);
check("duplex 1x1 has 2 pages", duplex1x1Pages.length === 2);
check(
  "duplex 1x1 front/back task split",
  duplex1x1Pages[0]?.kind === "grid" &&
    duplex1x1Pages[0].cells[0].items.length === 2 &&
    duplex1x1Pages[1]?.kind === "grid" &&
    duplex1x1Pages[1].cells[0].items.length === 2
);

const fit = computeCellFitScale(320, 360, 200, 250);
check("fit scale shrinks oversized content", fit.scale < 1 && !fit.tooLarge);
check(
  "fit scale respects width and height",
  Math.abs(fit.scale - 200 / 320) < 0.01
);

check("1x1 layout base scale", getLayoutBaseScale("1x1") === 1);
check("2x1 layout base scale", getLayoutBaseScale("2x1") === 0.95);
check("2x2 layout base scale", getLayoutBaseScale("2x2") === 0.8);
check("2x3 layout base scale", getLayoutBaseScale("2x3") === 0.75);
check("3x3 layout base scale", getLayoutBaseScale("3x3") === LAYOUT_BASE_SCALE["3x3"]);

const tooLarge = resolveCellContentScale(1, 1000, 1200, 100, 100);
check("too large content triggers warning", tooLarge.tooLarge);
check(
  "too large content clamps to minimum scale",
  tooLarge.scale === MIN_READABLE_CELL_SCALE
);
check(
  "layout warning message",
  CELL_LAYOUT_TOO_LARGE_MESSAGE.includes("too large")
);

const scaledPages = applyMeasuredCellScales(pdfPages, {
  "h1|i1|t:1|t:2|t:3": 0.62,
});
check(
  "measured scales applied to pdf cells",
  scaledPages[0]?.kind === "grid" &&
    scaledPages[0].cells[0].contentScale === 0.62
);

const baseScaledPages = applyMeasuredCellScales(pdfPages);
check(
  "layout base scale applied without measurement",
  baseScaledPages[0]?.kind === "grid" &&
    baseScaledPages[0].cells[0].contentScale === 0.75
);

check("subtask per cell layout detected", isSubtaskPerCellLayout("2x2-subtask"));
check(
  "subtask per cell uses 2x2 grid",
  parsePrintGrid("2x2-subtask").cols === 2 &&
    parsePrintGrid("2x2-subtask").rows === 2
);

const subtaskCards = expandDocumentItemsToSubtaskCards(
  [createDocumentTaskItem("task-1", 0)],
  () => ["a", "b", "c", "d"]
);
check("expands four subtasks into four cards", subtaskCards.length === 4);
check(
  "each card keeps one selected subtask",
  subtaskCards.every(
    (card) =>
      card.items.length === 1 &&
      card.items[0]?.selectedSubtasks?.length === 1
  )
);

const subtaskLayout = normalizePrintLayout(
  {
    grid: "2x2-subtask",
    duplex: true,
    splitAfterTask: 1,
    showCutLines: true,
    showCropMarks: true,
  },
  1
);
check("subtask layout disables duplex", subtaskLayout.duplex === false);

const sampleSubtaskDoc = {
  version: 1,
  paragraphs: [
    {
      id: "p1",
      children: [{ id: "t1", type: "text", text: "Solve:" }],
    },
    {
      id: "p2",
      children: [{ id: "t2", type: "text", text: "a) first" }],
    },
    {
      id: "p3",
      children: [{ id: "t3", type: "text", text: "b) second" }],
    },
    {
      id: "p4",
      children: [{ id: "t4", type: "text", text: "c) third" }],
    },
    {
      id: "p5",
      children: [{ id: "t5", type: "text", text: "d) fourth" }],
    },
  ],
};

const gridSplit = splitDocumentForSubtaskGrid(sampleSubtaskDoc);
check("subtask grid split keeps instruction", gridSplit?.instruction.paragraphs.length === 1);
check("subtask grid split finds four subtasks", gridSplit?.subtasks.length === 4);

const columns = partitionSubtasksIntoColumns(gridSplit?.subtasks ?? []);
check("subtask grid left column has a and c", columns.left.length === 2);
check("subtask grid right column has b and d", columns.right.length === 2);
check("subtask grid layout detected", isSubtaskGridLayout("2col-subtasks"));
check(
  "subtask grid uses standard page layout",
  parsePrintGrid("2col-subtasks").cols === 1 &&
    parsePrintGrid("2col-subtasks").rows === 1
);

const gridRows = chunkSubtasksIntoGridRows(gridSplit?.subtasks ?? []);
check("subtask grid rows pair a-b and c-d", gridRows.length === 2);
check("first subtask grid row has a and b", gridRows[0]?.length === 2);
check("second subtask grid row has c and d", gridRows[1]?.length === 2);

check(
  "subtask grid offset margin grows with drag",
  resolveSubtaskBlockMarginTopPx(1, "c", { c: 40 }) >
    resolveSubtaskBlockMarginTopPx(1, "c", undefined)
);
check(
  "subtask grid offsets normalize empty values",
  normalizeSubtaskGridOffsets({ a: 0, b: 12, x: 5 }, ["a", "b"])?.b === 12
);
check(
  "patch subtask grid offset removes zero",
  patchSubtaskGridOffset({ c: 20 }, "c", 0, ["c"]) === undefined
);

if (failed) {
  process.exitCode = 1;
  console.log("\nSome print layout checks failed.");
} else {
  console.log("\nAll print layout checks passed.");
}
