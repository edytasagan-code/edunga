"use client";

import type { GeneratorDocument } from "@/app/lib/documentGenerator";
import { CELL_LAYOUT_TOO_LARGE_MESSAGE } from "@/app/lib/printLayout/cellAutoScale";

import type { GeneratorTask } from "./DocumentGenerator";
import DocumentPrintPreview from "./DocumentPrintPreview";
import { usePrintCellScale } from "./PrintCellScaleContext";

type Props = {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  onSubtaskGridOffsetChange?: (
    entryId: string,
    label: string,
    offsetPx: number
  ) => void;
};

export default function DocumentPreviewPanel({
  document,
  taskMap,
  onSubtaskGridOffsetChange,
}: Props) {
  const printCellScale = usePrintCellScale();
  const showLayoutWarning =
    (printCellScale?.overflowWarnings.length ?? 0) > 0;

  return (
    <section className="edunga-panel flex h-full min-h-0 w-full flex-col p-4 lg:p-5">
      <h2 className="mb-3 shrink-0 text-xl font-bold edunga-text-body lg:text-2xl">
        Podgląd wydruku
      </h2>

      {showLayoutWarning ? (
        <p className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {CELL_LAYOUT_TOO_LARGE_MESSAGE}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <DocumentPrintPreview
            document={document}
            taskMap={taskMap}
            onSubtaskGridOffsetChange={onSubtaskGridOffsetChange}
          />
        </div>
      </div>
    </section>
  );
}
