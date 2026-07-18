"use client";

import { useLayoutEffect, useRef, useState } from "react";

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

export default function DocumentPrintPreview({
  document,
  taskMap,
  onSubtaskGridOffsetChange,
}: Props) {
  const { widthPx, heightPx, probeRef } = useA4Dimensions();

  const versions = resolveDocumentGroupVersions(document.display);

  if (document.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Dodaj zadania do dokumentu, aby zobaczyć podgląd wydruku.
      </p>
    );
  }

  return (
    <>
      <A4DimensionProbe probeRef={probeRef} />

      <A4PreviewScaler pageSize={{ widthPx, heightPx }}>
        <div className="document-preview-versions">
          {versions.map((version) => (
            <DocumentVersionPreview
              key={version.group || "default"}
              document={document}
              taskMap={taskMap}
              version={version}
              heightPx={heightPx}
              widthPx={widthPx}
              onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
            />
          ))}
        </div>
      </A4PreviewScaler>
    </>
  );
}

function DocumentVersionPreview({
  document,
  taskMap,
  version,
  heightPx,
  widthPx,
  onSubtaskGridOffsetChange,
}: {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  heightPx: number;
  widthPx: number;
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
    return (
      <GridLayoutPreview
        document={document}
        taskMap={taskMap}
        version={version}
        heightPx={heightPx}
        widthPx={widthPx}
        layoutPages={layoutPages}
      />
    );
  }

  return (
    <StandardPreview
      document={document}
      taskMap={taskMap}
      version={version}
      heightPx={heightPx}
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
                          ? "1px dashed #d4d4d8"
                          : undefined,
                      borderBottom:
                        page.guides.showCutLines && row < page.rows - 1
                          ? "1px dashed #d4d4d8"
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

function StandardPreview({
  document,
  taskMap,
  version,
  heightPx,
  items,
  subtaskGridLayout,
  onSubtaskGridOffsetChange,
}: {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  version: DocumentGroupVersion;
  heightPx: number;
  items: DocumentItem[];
  subtaskGridLayout: boolean;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
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

  const sheetContent = (
    <>
      {showPreviewHeader ? (
        <DocumentSheetHeader
          title={document.title}
          display={versionDisplay}
          calculatedTotalPoints={calculatedTotalPoints}
        />
      ) : null}

      <DocumentStudentInstructions display={versionDisplay} />

      <DocumentSheetItems
        items={items}
        taskMap={taskMap}
        version={version}
        taskNumberByEntryId={taskNumberByEntryId}
        renumberSelectedSubtasks={document.display.renumberSelectedSubtasks}
        subtaskGridLayout={subtaskGridLayout}
        onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
      />
    </>
  );

  useLayoutEffect(() => {
    const measureEl = measureRef.current;

    if (!measureEl || heightPx <= 0) {
      return;
    }

    const contentHeight = measureEl.scrollHeight;
    setPageCount(Math.max(1, Math.ceil(contentHeight / heightPx)));
  }, [document, taskMap, heightPx, showPreviewHeader, version, items]);

  return (
    <>
      <div aria-hidden className="document-preview-measure">
        <div
          ref={measureRef}
          className="document-preview-sheet document-preview-sheet--measure"
        >
          {sheetContent}
        </div>
      </div>

      <div className="document-preview-pages">
        {Array.from({ length: pageCount }).map((_, pageIndex) => (
          <div
            key={pageIndex}
            className="document-preview-page"
            style={{ height: heightPx }}
          >
            <div
              className="document-preview-page__window"
              style={{ marginTop: -pageIndex * heightPx }}
            >
              <div className="document-preview-sheet">{sheetContent}</div>
            </div>
          </div>
        ))}
      </div>
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
}) {
  return (
    <ol className="list-none">
      {items.map((item) => {
        if (isDocumentAnswerAreaItem(item)) {
          return (
            <li
              key={item.entryId}
              className="document-preview-item document-preview-item--answer-area"
            >
              <AnswerAreaBoxFromItem item={item} />
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
          <li key={item.entryId} className="document-preview-item">
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
                  <p className="text-sm text-zinc-500">
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
