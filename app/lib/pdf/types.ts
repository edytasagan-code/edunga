import type { EditorDocument } from "@/app/components/editor/types";

import type {
  AnswerAreaItemType,
  DocumentDisplayOptions,
} from "@/app/lib/documentGenerator";
import type {
  PdfLayoutCell,
  PdfLayoutPage,
  PrintLayoutOptions,
} from "@/app/lib/printLayout";

export type PdfExportTaskItem = {
  kind: "task";
  taskId: string;
  variantIndex: number;
  selectedSubtasks?: string[];
  subtaskGridOffsets?: Record<string, number>;
  document?: unknown;
};

export type PdfExportAnswerAreaItem = {
  kind: "answer-area";
  areaType: AnswerAreaItemType;
  answerHeightPx: number;
};

export type PdfExportItem = PdfExportTaskItem | PdfExportAnswerAreaItem;

export type PdfExportVersion = {
  display?: Partial<DocumentDisplayOptions>;
  items: PdfExportItem[];
};

export type PdfExportRequest = {
  title: string;
  display?: Partial<DocumentDisplayOptions>;
  items?: PdfExportItem[];
  versions?: PdfExportVersion[];
  printLayout?: PrintLayoutOptions;
  measuredCellScales?: Record<string, number>;
};

export type PdfTaskContentItem = {
  kind: "task";
  number: number;
  value: unknown;
  subtaskLabel?: string;
  subtaskGridOffsets?: Record<string, number>;
};

export type PdfAnswerAreaContentItem = {
  kind: "answer-area";
  areaType: AnswerAreaItemType;
  answerHeightPx: number;
};

export type PdfDocumentContentItem =
  | PdfTaskContentItem
  | PdfAnswerAreaContentItem;

export type PdfDocumentData = {
  title: string;
  display: DocumentDisplayOptions;
  items: PdfDocumentContentItem[];
  subtaskGridLayout?: boolean;
};

export type { PdfLayoutCell, PdfLayoutPage, PrintLayoutOptions };

export function isEditorDocument(value: unknown): value is EditorDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EditorDocument).version === "number" &&
    Array.isArray((value as EditorDocument).paragraphs)
  );
}
