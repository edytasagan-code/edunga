"use client";

import { useEffect, useLayoutEffect, useRef, useState, memo } from "react";

import DocumentViewer from "@/app/components/document-viewer";
import SubtaskGridDocumentViewer from "@/app/components/document-viewer/SubtaskGridDocumentViewer";
import {
  A4DimensionProbe,
  useA4Dimensions,
} from "@/app/lib/a4Dimensions";
import {
  calculateDocumentTaskPoints,
  displayForDocumentVersion,
  isDocumentAnswerAreaItem,
  isDocumentTaskItem,
  resolveDocumentGroupVersions,
  resolveItemVariantIndex,
  type DocumentGroupVersion,
  type DocumentItem,
  type DocumentTaskItem,
  type GeneratorDocument,
} from "@/app/lib/documentGenerator";
import {
  buildPreviewLayoutPages,
  getLayoutBaseScale,
  isSubtaskGridLayout,
  normalizePrintLayout,
  countDocumentTasks,
  type PreviewLayoutCell,
  type PreviewLayoutPage,
} from "@/app/lib/printLayout";
import { shouldUseSubtaskGridLayout } from "@/app/lib/subtaskGridLayout";
import { detectSubtasks } from "@/app/lib/subtaskSelection";
import { normalizeVariants } from "@/app/lib/variants";
import {
  computeAvailableCellSizePx,
  previewCellScaleKey,
} from "@/app/lib/printLayout/cellAutoScale";
import { resolveTaskContentForDocument } from "@/app/lib/documentTaskContent";
import { formatTaskNumber } from "@/app/lib/taskNumbering";
import {
  SAFE_PRINT_BOTTOM_MARGIN_MM,
  SAFE_PRINT_BOTTOM_MARGIN_PX,
  cssVarLengthToPx,
  outerHeight,
  sheetContentCapacityPx,
} from "@/app/lib/printPageGeometry";

import { AnswerAreaBoxFromItem } from "./AnswerAreaBox";
import A4PreviewScaler from "./A4PreviewScaler";
import { MeasureGridCell, ScaledGridCell } from "./AutoScaleGridCell";
import type { GeneratorTask } from "./DocumentGenerator";
import DocumentSheetHeader, {
  DocumentStudentInstructions,
  showDocumentSheetHeader,
} from "./DocumentSheetHeader";

import "./document-preview.css";

const PREVIEW_PAGE_PADDING_H_PX = (1.75 * 96) / 16;
const PREVIEW_PAGE_PADDING_V_PX = (1.5 * 96) / 16;

type Props = {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
  /**
   * Panel chrome only (not document appearance). Default true wraps pages in
   * A4PreviewScaler for the generator panel. Print/Playwright pass false for
   * natural A4 1:1 — same DocumentPrintPreview markup/CSS either way.
   */
  fitToPanel?: boolean;
};

function taskVariantContent(
  task: GeneratorTask,
  variantIndex: number,
  selectedSubtasks?: string[],
  renumberSelectedSubtasks = true
): unknown {
  return resolveTaskContentForDocument(task, variantIndex, {
    selectedSubtasks,
    renumberSelectedSubtasks,
  });
}

function resolveTaskSubtasks(
  item: DocumentTaskItem,
  taskMap: Map<string, GeneratorTask>,
  version: DocumentGroupVersion
): string[] {
  const task = taskMap.get(item.taskId);

  if (!task) {
    return [];
  }

  const variantIndex = resolveItemVariantIndex(item, version);
  const variants = normalizeVariants(task);
  const raw = variants[variantIndex]?.tresc ?? variants[0]?.tresc;

  return detectSubtasks(raw);
}

function TaskContentViewer({
  content,
  entryId,
  variantIndex,
  subtaskGridLayout,
  subtaskGridOffsets,
  onSubtaskGridOffsetChange,
}: {
  content: unknown;
  entryId: string;
  variantIndex: number;
  subtaskGridLayout: boolean;
  subtaskGridOffsets?: Record<string, number>;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
}) {
  if (shouldUseSubtaskGridLayout(content, subtaskGridLayout)) {
    return (
      <SubtaskGridDocumentViewer
        key={`${entryId}-${variantIndex}-grid`}
        value={content}
        offsets={subtaskGridOffsets}
        draggable={Boolean(onSubtaskGridOffsetChange)}
        onOffsetChange={(label, offsetPx) =>
          onSubtaskGridOffsetChange?.(entryId, label, offsetPx)
        }
      />
    );
  }

  return (
    <DocumentViewer key={`${entryId}-${variantIndex}`} value={content} />
  );
}

function buildTaskNumberMap(items: DocumentItem[]): Map<string, number> {
  const taskNumberByEntryId = new Map<string, number>();
  let taskNumber = 0;

  for (const item of items) {
    if (!isDocumentTaskItem(item)) {
      continue;
    }

    taskNumber += 1;
    taskNumberByEntryId.set(item.entryId, taskNumber);
  }

  return taskNumberByEntryId;
}

export default memo(function DocumentPrintPreview({
  document,
  taskMap,
  onSubtaskGridOffsetChange,
  fitToPanel = true,
}: Props) {
  const { widthPx, heightPx, probeRef } = useA4Dimensions();

  const versions = resolveDocumentGroupVersions(document.display);

  return (
    <div
      data-document-print-preview
      style={
        {
          // Single source: TS constant → CSS var → sheet padding → packing capacity.
          ["--doc-page-padding-block-end" as string]: `${SAFE_PRINT_BOTTOM_MARGIN_MM}mm`,
        }
      }
    >
      <A4DimensionProbe probeRef={probeRef} />

      <div className="document-preview-versions">
        {versions.map((version) => (
          <DocumentVersionPreview
            key={version.group || "default"}
            document={document}
            taskMap={taskMap}
            version={version}
            heightPx={heightPx}
            widthPx={widthPx}
            fitToPanel={fitToPanel}
            onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
          />
        ))}
      </div>
    </div>
  );
});

function DocumentVersionPreview({
  document,
  taskMap,
  version,
  heightPx,
  widthPx,
  fitToPanel,
  onSubtaskGridOffsetChange,
}: {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  heightPx: number;
  widthPx: number;
  fitToPanel: boolean;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
}) {
  const layoutPages = buildPreviewLayoutPages(document, {
    getTaskSubtasks: (item) => resolveTaskSubtasks(item, taskMap, version),
  });

  if (layoutPages) {
    const grid = (
      <GridLayoutPreview
        document={document}
        taskMap={taskMap}
        version={version}
        heightPx={heightPx}
        widthPx={widthPx}
        layoutPages={layoutPages}
      />
    );

    return fitToPanel ? (
      <A4PreviewScaler pageSize={{ widthPx, heightPx }}>{grid}</A4PreviewScaler>
    ) : (
      grid
    );
  }

  return (
    <StandardPreview
      document={document}
      taskMap={taskMap}
      version={version}
      heightPx={heightPx}
      widthPx={widthPx}
      fitToPanel={fitToPanel}
      items={document.items}
      subtaskGridLayout={isSubtaskGridLayout(
        normalizePrintLayout(
          document.printLayout,
          countDocumentTasks(document.items)
        ).grid
      )}
      onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
    />
  );
}

function GridLayoutPreview({
  document,
  taskMap,
  version,
  heightPx,
  widthPx,
  layoutPages,
}: {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  heightPx: number;
  widthPx: number;
  layoutPages: PreviewLayoutPage[];
}) {
  const versionDisplay = displayForDocumentVersion(
    document.display,
    version.group
  );
  const calculatedTotalPoints = calculateDocumentTaskPoints(
    document.items,
    (taskId) => taskMap.get(taskId)?.punkty
  );
  const taskNumberByEntryId = buildTaskNumberMap(document.items);

  return (
    <div className="document-preview-pages">
      {layoutPages.map((page, pageIndex) => {
        const availableCellSize = computeAvailableCellSizePx(
          widthPx,
          heightPx,
          page.cols,
          page.rows,
          PREVIEW_PAGE_PADDING_H_PX,
          PREVIEW_PAGE_PADDING_V_PX
        );

        const uniqueCellKeys = new Map<string, PreviewLayoutCell>();

        for (const cell of page.cells) {
          const key = previewCellScaleKey(cell, taskNumberByEntryId);

          if (!uniqueCellKeys.has(key)) {
            uniqueCellKeys.set(key, cell);
          }
        }

        const layoutBaseScale = getLayoutBaseScale(page.gridLayout);

        return (
          <div
            key={pageIndex}
            className="document-preview-page document-preview-page--layout"
            data-document-preview-page
            style={{ height: heightPx }}
          >
            <div aria-hidden className="document-preview-cell-measure-lane">
              {[...uniqueCellKeys.entries()].map(([cellKey, cell]) => (
                <MeasureGridCell
                  key={cellKey}
                  cellKey={cellKey}
                  layoutBaseScale={layoutBaseScale}
                  availableWidth={availableCellSize.width}
                  availableHeight={availableCellSize.height}
                >
                  <GridCellContent
                    documentTitle={document.title}
                    versionDisplay={versionDisplay}
                    calculatedTotalPoints={calculatedTotalPoints}
                    cell={cell}
                    taskMap={taskMap}
                    version={version}
                    taskNumberByEntryId={taskNumberByEntryId}
                    renumberSelectedSubtasks={
                      document.display.renumberSelectedSubtasks
                    }
                  />
                </MeasureGridCell>
              ))}
            </div>

            <div
              className={`document-preview-grid${
                page.guides.showCutLines
                  ? " document-preview-grid--cut-lines"
                  : ""
              }${
                page.guides.showCropMarks
                  ? " document-preview-grid--crop-marks"
                  : ""
              }`}
              style={{
                ["--grid-cols" as string]: page.cols,
                ["--grid-rows" as string]: page.rows,
              }}
            >
              {page.cells.map((cell, cellIndex) => {
                const col = cellIndex % page.cols;
                const row = Math.floor(cellIndex / page.cols);
                const cellKey = previewCellScaleKey(cell, taskNumberByEntryId);

                return (
                  <div
                    key={cellIndex}
                    className="document-preview-grid-cell"
                    style={{
                      borderRight:
                        page.guides.showCutLines && col < page.cols - 1
                          ? "1px dashed #a1a1aa"
                          : undefined,
                      borderBottom:
                        page.guides.showCutLines && row < page.rows - 1
                          ? page.cols === 1 && page.rows === 2
                            ? "1.5px dashed #52525b"
                            : "1px dashed #a1a1aa"
                          : undefined,
                    }}
                  >
                    <div className="document-preview-sheet document-preview-sheet--cell">
                      <ScaledGridCell
                        cellKey={cellKey}
                        layoutBaseScale={layoutBaseScale}
                        availableWidth={availableCellSize.width}
                        availableHeight={availableCellSize.height}
                      >
                        <GridCellContent
                          documentTitle={document.title}
                          versionDisplay={versionDisplay}
                          calculatedTotalPoints={calculatedTotalPoints}
                          cell={cell}
                          taskMap={taskMap}
                          version={version}
                          taskNumberByEntryId={taskNumberByEntryId}
                          renumberSelectedSubtasks={
                            document.display.renumberSelectedSubtasks
                          }
                        />
                      </ScaledGridCell>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridCellContent({
  documentTitle,
  versionDisplay,
  calculatedTotalPoints,
  cell,
  taskMap,
  version,
  taskNumberByEntryId,
  renumberSelectedSubtasks,
}: {
  documentTitle: string;
  versionDisplay: ReturnType<typeof displayForDocumentVersion>;
  calculatedTotalPoints: number;
  cell: PreviewLayoutCell;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  taskNumberByEntryId: Map<string, number>;
  renumberSelectedSubtasks: boolean;
}) {
  return (
    <>
      {cell.showHeader &&
      showDocumentSheetHeader(documentTitle, versionDisplay) ? (
        <DocumentSheetHeader
          title={documentTitle}
          display={versionDisplay}
          calculatedTotalPoints={calculatedTotalPoints}
        />
      ) : null}

      {cell.showInstructions ? (
        <DocumentStudentInstructions display={versionDisplay} />
      ) : null}

      <DocumentSheetItems
        items={cell.items}
        taskMap={taskMap}
        version={version}
        taskNumberByEntryId={taskNumberByEntryId}
        renumberSelectedSubtasks={renumberSelectedSubtasks}
      />
    </>
  );
}

/**
 * Keep each task together with the answer-area boxes that follow it.
 * Prevents orphan "grid-only" pages at the end of the document.
 */
function groupItemsIntoBlocks(items: DocumentItem[]): number[][] {
  const blocks: number[][] = [];
  let index = 0;

  while (index < items.length) {
    const item = items[index];

    if (isDocumentTaskItem(item)) {
      const block = [index];
      index += 1;
      while (index < items.length && isDocumentAnswerAreaItem(items[index])) {
        block.push(index);
        index += 1;
      }
      blocks.push(block);
      continue;
    }

    if (isDocumentAnswerAreaItem(item)) {
      if (blocks.length > 0) {
        blocks[blocks.length - 1].push(index);
      } else {
        blocks.push([index]);
      }
      index += 1;
      continue;
    }

    index += 1;
  }

  return blocks;
}

function packBlocksIntoPages(
  blocks: number[][],
  itemHeights: number[],
  firstPageCapacity: number,
  nextPageCapacity: number,
  itemGap: number,
  items: DocumentItem[],
  /** Natural answer-box border-box heights (without li chrome) for cap mapping. */
  answerBoxHeights: Map<string, number> = new Map()
): { pages: number[][]; answerHeightCaps: Map<string, number> } {
  if (blocks.length === 0) {
    return { pages: [[]], answerHeightCaps: new Map() };
  }

  const pages: number[][] = [[]];
  let remaining = firstPageCapacity;
  const answerHeightCaps = new Map<string, number>();
  const heights = itemHeights.slice();

  const blockHeight = (block: number[]) => {
    let total = 0;
    block.forEach((itemIndex, offset) => {
      total += heights[itemIndex] ?? 0;
      if (offset > 0) {
        total += itemGap;
      }
    });
    return total;
  };

  /** Shrink trailing answer areas so the block fits `capacity` (measured, not guessed). */
  const fitBlockToCapacity = (block: number[], capacity: number) => {
    let height = blockHeight(block);
    if (height <= capacity) {
      return height;
    }

    for (let i = block.length - 1; i >= 0 && height > capacity; i -= 1) {
      const itemIndex = block[i];
      const item = items[itemIndex];
      if (!isDocumentAnswerAreaItem(item)) {
        continue;
      }

      const overflow = height - capacity;
      const current = heights[itemIndex] ?? 0;
      const nextLiHeight = Math.max(0, current - overflow);
      const reduced = current - nextLiHeight;
      if (reduced <= 0) {
        continue;
      }

      heights[itemIndex] = nextLiHeight;
      // Caps apply to AnswerAreaBox style.height — strip li/box chrome so the
      // rendered li matches the packer's reduced item height.
      const naturalBox = answerBoxHeights.get(item.entryId) ?? current;
      const chrome = Math.max(0, current - naturalBox);
      answerHeightCaps.set(item.entryId, Math.max(0, nextLiHeight - chrome));
      height -= reduced;
    }

    return height;
  };

  for (const block of blocks) {
    let height = blockHeight(block);
    const gap = pages[pages.length - 1].length > 0 ? itemGap : 0;
    let needed = height + gap;

    if (pages[pages.length - 1].length > 0 && needed > remaining) {
      pages.push([...block]);
      height = fitBlockToCapacity(block, nextPageCapacity);
      remaining = Math.max(0, nextPageCapacity - height);
      continue;
    }

    if (pages[pages.length - 1].length === 0) {
      height = fitBlockToCapacity(
        block,
        pages.length === 1 ? firstPageCapacity : nextPageCapacity
      );
      needed = height;
    }

    if (pages[pages.length - 1].length === 0 && height > remaining) {
      pages[pages.length - 1].push(...block);
      remaining = 0;
      continue;
    }

    pages[pages.length - 1].push(...block);
    remaining = Math.max(0, remaining - needed);
  }

  return { pages, answerHeightCaps };
}

function dropAnswerOnlyPages(
  pages: number[][],
  items: DocumentItem[]
): number[][] {
  const filtered = pages.filter((pageIndexes) =>
    pageIndexes.some((itemIndex) => isDocumentTaskItem(items[itemIndex]))
  );
  return filtered.length > 0 ? filtered : [[]];
}

function StandardPreview({
  document,
  taskMap,
  version,
  heightPx,
  widthPx,
  fitToPanel,
  items,
  subtaskGridLayout,
  onSubtaskGridOffsetChange,
}: {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  heightPx: number;
  widthPx: number;
  fitToPanel: boolean;
  items: DocumentItem[];
  subtaskGridLayout: boolean;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const packedContentKeyRef = useRef<string | null>(null);
  const [pageItemIndexes, setPageItemIndexes] = useState<number[][]>([
    items.map((_, index) => index),
  ]);
  const [answerHeightCaps, setAnswerHeightCaps] = useState<Map<string, number>>(
    () => new Map()
  );
  const [assetsRevision, setAssetsRevision] = useState(0);
  const versionDisplay = displayForDocumentVersion(
    document.display,
    version.group
  );
  const calculatedTotalPoints = calculateDocumentTaskPoints(
    document.items,
    (taskId) => taskMap.get(taskId)?.punkty
  );
  const taskNumberByEntryId = buildTaskNumberMap(document.items);

  const showPreviewHeader = showDocumentSheetHeader(
    document.title,
    versionDisplay
  );

  // Fingerprint of what affects pagination — export UI must not change this.
  const packContentKey = [
    version.group || "default",
    document.title,
    String(showPreviewHeader),
    JSON.stringify(document.display),
    JSON.stringify(items),
    String(assetsRevision),
    String(Math.round(heightPx * 100) / 100),
    `bottomPadMm:${SAFE_PRINT_BOTTOM_MARGIN_MM}`,
  ].join("|");

  // Modest writing space in print/preview — never a leftover full-page grid.
  const printAnswerAreaMaxPx = Math.round((3.5 * 96) / 2.54);
  const sheetPadStyle = {
    paddingBottom: `${SAFE_PRINT_BOTTOM_MARGIN_MM}mm`,
  } as const;

  useEffect(() => {
    const measureEl = measureRef.current;

    if (!measureEl) {
      return;
    }

    let cancelled = false;
    const images = Array.from(measureEl.querySelectorAll("img"));
    const mathHosts = Array.from(
      measureEl.querySelectorAll('[data-node-type="math"]')
    );

    let pendingImages = images.filter((img) => !img.complete).length;
    let mathReady = mathHosts.length === 0;
    let bumped = false;

    const bumpOnce = () => {
      if (cancelled || bumped) {
        return;
      }
      if (pendingImages > 0 || !mathReady) {
        return;
      }
      bumped = true;
      const afterFonts =
        "fonts" in window.document
          ? window.document.fonts.ready.catch(() => undefined)
          : Promise.resolve();
      void afterFonts.then(() => {
        if (!cancelled) {
          setAssetsRevision((value) => value + 1);
        }
      });
    };

    const onImageSettled = () => {
      pendingImages -= 1;
      bumpOnce();
    };

    for (const img of images) {
      if (img.complete) {
        continue;
      }
      img.addEventListener("load", onImageSettled);
      img.addEventListener("error", onImageSettled);
    }

    let mathTries = 0;
    const mathTimer = window.setInterval(() => {
      mathTries += 1;
      const ready =
        mathHosts.length === 0 ||
        measureEl.querySelectorAll(".katex").length >= mathHosts.length;
      if (ready || mathTries > 40) {
        window.clearInterval(mathTimer);
        mathReady = true;
        bumpOnce();
      }
    }, 50);

    bumpOnce();

    return () => {
      cancelled = true;
      window.clearInterval(mathTimer);
      for (const img of images) {
        img.removeEventListener("load", onImageSettled);
        img.removeEventListener("error", onImageSettled);
      }
    };
  }, [document, taskMap, version.group, items]);

  // Pass 1: pack from the measure lane using probed A4 height (same as page boxes).
  useLayoutEffect(() => {
    const measureEl = measureRef.current;

    if (!measureEl || heightPx <= 0) {
      return;
    }

    // Skip re-pack when content/geometry fingerprint is unchanged (e.g. parent
    // re-render from export button). Export must never rebuild preview pages.
    if (packedContentKeyRef.current === packContentKey) {
      return;
    }

    const previewRoot = measureEl.closest(
      "[data-document-print-preview]"
    ) as HTMLElement | null;
    previewRoot?.removeAttribute("data-preview-pages-ready");

    // Measure the real header/instructions nodes (not wrappers). Wrappers drop
    // collapsing child margins via offsetHeight, which inflated first-page
    // capacity and packed content into the 7mm bottom padding.
    const headerInner = measureEl.querySelector(
      "[data-preview-measure-header] .document-preview-header"
    ) as HTMLElement | null;
    const instructionsInner = measureEl.querySelector(
      "[data-preview-measure-instructions] .document-preview-instructions"
    ) as HTMLElement | null;
    const itemEls = Array.from(
      measureEl.querySelectorAll("[data-preview-measure-item]")
    ) as HTMLElement[];

    const headerHeight = headerInner ? outerHeight(headerInner) : 0;
    const instructionsHeight = instructionsInner
      ? outerHeight(instructionsInner)
      : 0;
    const computed = getComputedStyle(measureEl);
    const sheetFontPx = parseFloat(computed.fontSize || "16") || 16;
    const remPx =
      parseFloat(
        getComputedStyle(window.document.documentElement).fontSize || "16"
      ) || 16;
    // --doc-page-continue-gap is em (sheet); --doc-task-gap is rem (root).
    const pageTopGapHeight =
      cssVarLengthToPx(
        computed.getPropertyValue("--doc-page-continue-gap"),
        sheetFontPx,
        remPx
      ) || 0.4 * sheetFontPx;
    const itemGap =
      cssVarLengthToPx(
        computed.getPropertyValue("--doc-task-gap"),
        sheetFontPx,
        remPx
      ) || 0.7 * remPx;
    const padTop = parseFloat(computed.paddingTop) || 0;
    // Prefer live computed padding (same mm→px as the sheet) over the theoretical constant.
    const padBottom = Math.max(
      parseFloat(computed.paddingBottom) || 0,
      SAFE_PRINT_BOTTOM_MARGIN_PX
    );

    const contentCapacity = sheetContentCapacityPx(heightPx, padTop, padBottom);
    const firstPageCapacity = Math.max(
      80,
      contentCapacity - headerHeight - instructionsHeight
    );
    const nextPageCapacity = Math.max(80, contentCapacity - pageTopGapHeight);

    const itemHeights = items.map(() => 0);
    const answerBoxHeights = new Map<string, number>();
    for (const el of itemEls) {
      const rawIndex = el.getAttribute("data-preview-measure-item");
      const itemIndex = rawIndex == null ? NaN : Number(rawIndex);
      if (
        Number.isInteger(itemIndex) &&
        itemIndex >= 0 &&
        itemIndex < items.length
      ) {
        // offsetHeight only — inter-item gap is applied separately in the packer.
        itemHeights[itemIndex] = el.offsetHeight;
        const item = items[itemIndex];
        if (isDocumentAnswerAreaItem(item)) {
          const box = el.querySelector(
            ".document-preview-answer-area"
          ) as HTMLElement | null;
          if (box) {
            answerBoxHeights.set(item.entryId, box.offsetHeight);
          }
        }
      }
    }

    const blocks = groupItemsIntoBlocks(items);
    const { pages: packedPages, answerHeightCaps: caps } = packBlocksIntoPages(
      blocks,
      itemHeights,
      firstPageCapacity,
      nextPageCapacity,
      itemGap,
      items,
      answerBoxHeights
    );
    const packed = dropAnswerOnlyPages(packedPages, items);

    packedContentKeyRef.current = packContentKey;
    setAnswerHeightCaps(caps);
    setPageItemIndexes(packed);

    // Only advertise readiness after the assets/fonts bump. An early pack at
    // assetsRevision 0 can freeze wrong heights and make panel ≠ Playwright PDF.
    if (previewRoot && assetsRevision > 0) {
      previewRoot.setAttribute("data-preview-pages-ready", "true");
      previewRoot.setAttribute(
        "data-preview-page-count",
        String(Math.max(1, packed.length))
      );
      previewRoot.setAttribute(
        "data-preview-page-height-px",
        String(heightPx)
      );
      previewRoot.setAttribute(
        "data-preview-bottom-margin-mm",
        String(SAFE_PRINT_BOTTOM_MARGIN_MM)
      );
    }
  }, [
    packContentKey,
    document,
    taskMap,
    heightPx,
    showPreviewHeader,
    version.group,
    items,
    assetsRevision,
  ]);

  useEffect(() => {
    return () => {
      const previewRoot = measureRef.current?.closest(
        "[data-document-print-preview]"
      ) as HTMLElement | null;
      previewRoot?.removeAttribute("data-preview-pages-ready");
      previewRoot?.removeAttribute("data-preview-page-count");
      previewRoot?.removeAttribute("data-preview-page-height-px");
      previewRoot?.removeAttribute("data-preview-bottom-margin-mm");
    };
  }, []);

  const pages = (
    <div ref={pagesRef} className="document-preview-pages">
      {pageItemIndexes.map((indexes, pageIndex) => {
        const pageItems = indexes
          .map((index) => items[index])
          .filter(Boolean);

        return (
          <div
            key={pageIndex}
            className="document-preview-page"
            data-document-preview-page
            data-page-index={pageIndex}
            style={{
              width: "210mm",
              height: heightPx > 0 ? heightPx : "297mm",
            }}
          >
            <div
              className="document-preview-sheet"
              style={sheetPadStyle}
            >
              {pageIndex === 0 && showPreviewHeader ? (
                <DocumentSheetHeader
                  title={document.title}
                  display={versionDisplay}
                  calculatedTotalPoints={calculatedTotalPoints}
                />
              ) : null}

              {pageIndex === 0 ? (
                <DocumentStudentInstructions display={versionDisplay} />
              ) : (
                <div aria-hidden className="document-preview-page-top-gap" />
              )}

              <DocumentSheetItems
                items={pageItems}
                taskMap={taskMap}
                version={version}
                taskNumberByEntryId={taskNumberByEntryId}
                renumberSelectedSubtasks={
                  document.display.renumberSelectedSubtasks
                }
                subtaskGridLayout={subtaskGridLayout}
                onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
                answerAreaMaxHeightPx={printAnswerAreaMaxPx}
                answerHeightCaps={answerHeightCaps}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/*
        Measure lane must stay OUTSIDE A4PreviewScaler. Packing uses layout
        metrics; a CSS transform on ancestors previously corrupted refine and
        made panel pagination diverge from the unscaled PDF host.
      */}
      <div aria-hidden className="document-preview-measure">
        <div
          ref={measureRef}
          className="document-preview-sheet document-preview-sheet--measure"
          style={sheetPadStyle}
        >
          {showPreviewHeader ? (
            <div data-preview-measure-header>
              <DocumentSheetHeader
                title={document.title}
                display={versionDisplay}
                calculatedTotalPoints={calculatedTotalPoints}
              />
            </div>
          ) : null}

          <div data-preview-measure-instructions>
            <DocumentStudentInstructions display={versionDisplay} />
          </div>

          <DocumentSheetItems
            items={items}
            taskMap={taskMap}
            version={version}
            taskNumberByEntryId={taskNumberByEntryId}
            renumberSelectedSubtasks={document.display.renumberSelectedSubtasks}
            subtaskGridLayout={subtaskGridLayout}
            onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
            measureItemAttr
            answerAreaMaxHeightPx={printAnswerAreaMaxPx}
          />
        </div>
      </div>

      {fitToPanel ? (
        <A4PreviewScaler pageSize={{ widthPx, heightPx }}>{pages}</A4PreviewScaler>
      ) : (
        pages
      )}
    </>
  );
}

function DocumentSheetItems({
  items,
  taskMap,
  version,
  taskNumberByEntryId,
  renumberSelectedSubtasks,
  subtaskGridLayout = false,
  onSubtaskGridOffsetChange,
  measureItemAttr = false,
  answerAreaMaxHeightPx,
  answerHeightCaps,
}: {
  items: DocumentItem[];
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  taskNumberByEntryId: Map<string, number>;
  renumberSelectedSubtasks: boolean;
  subtaskGridLayout?: boolean;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
  measureItemAttr?: boolean;
  answerAreaMaxHeightPx?: number;
  answerHeightCaps?: Map<string, number>;
}) {
  return (
    <ol className="document-preview-list">
      {items.map((item, itemIndex) => {
        if (isDocumentAnswerAreaItem(item)) {
          const capped = answerHeightCaps?.get(item.entryId);
          const maxHeightPx =
            typeof capped === "number"
              ? capped
              : answerAreaMaxHeightPx;

          return (
            <li
              key={item.entryId}
              className="document-preview-item document-preview-item--answer-area"
              {...(measureItemAttr
                ? { "data-preview-measure-item": String(itemIndex) }
                : {})}
            >
              <AnswerAreaBoxFromItem
                item={item}
                maxHeightPx={maxHeightPx}
              />
            </li>
          );
        }

        if (!isDocumentTaskItem(item)) {
          return null;
        }

        const task = taskMap.get(item.taskId);
        const variantIndex = resolveItemVariantIndex(item, version);
        const content = task
          ? taskVariantContent(
              task,
              variantIndex,
              item.selectedSubtasks,
              renumberSelectedSubtasks
            )
          : null;

        return (
          <li
            key={item.entryId}
            className="document-preview-item"
            {...(measureItemAttr
              ? { "data-preview-measure-item": String(itemIndex) }
              : {})}
          >
            <div className="document-preview-task">
              <span className="document-preview-task__number">
                {formatTaskNumber(taskNumberByEntryId.get(item.entryId) ?? 0)}
              </span>

              <div className="document-preview-task__body">
                {content ? (
                  <TaskContentViewer
                    content={content}
                    entryId={item.entryId}
                    variantIndex={variantIndex}
                    subtaskGridLayout={subtaskGridLayout}
                    subtaskGridOffsets={item.subtaskGridOffsets}
                    onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
                  />
                ) : (
                  <p className="text-sm edunga-text-muted">
                    Nie znaleziono treści zadania.
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
