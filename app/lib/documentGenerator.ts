import type { PrintLayoutOptions } from "@/app/lib/printLayout";
import type { DocumentType } from "@/app/lib/documentMetadata";

export type { DocumentType };



export type AnswerAreaItemType = "blank" | "lines" | "grid";



export type AnswerAreaType =

  | "none"

  | AnswerAreaItemType

  | "grid-5mm"

  | "grid-10mm";



export type AnswerAreaHeight =

  | "2cm"

  | "3cm"

  | "4cm"

  | "5cm"

  | "6cm"

  | "1cm"

  | "full-page";



export type DocumentTaskItem = {

  kind: "task";

  entryId: string;

  taskId: string;

  variantIndex: number;

  /** Included subtask labels (a–d). Undefined means all subtasks. */

  selectedSubtasks?: string[];

  /** Extra top spacing (preview px) for subtask grid blocks, keyed by label. */

  subtaskGridOffsets?: Record<string, number>;

};



export type DocumentAnswerAreaItem = {

  kind: "answer-area";

  entryId: string;

  areaType: AnswerAreaItemType;

  /** Default height in centimetres (used when heightPx is null). */

  heightCm: number;

  /** Drag-resized height override in preview pixels. */

  heightPx: number | null;

};



export type DocumentItem = DocumentTaskItem | DocumentAnswerAreaItem;



/** @deprecated Use DocumentTaskItem */

export type DocumentTaskRef = DocumentTaskItem;



export type DocumentDisplayOptions = {

  showTitle: boolean;

  showDate: boolean;

  showStudentName: boolean;

  showClass: boolean;

  showGroup: boolean;

  showTotalPoints: boolean;

  showStudentInstructions: boolean;

  date: string;

  className: string;

  /** Set only when rendering a group-specific document version. */
  group: string;

  selectedGroups: string[];

  studentInstructions: string;

  totalPoints: string;

  totalPointsCustomized: boolean;

  /** Renumber partial subtask selection sequentially (a, b, c…) in output. */

  renumberSelectedSubtasks: boolean;

};



export type GeneratorDocument = {
  title: string;
  type: DocumentType;
  display: DocumentDisplayOptions;
  printLayout: PrintLayoutOptions;
  items: DocumentItem[];
};



/** Writing line after „Imię i nazwisko” in preview (flexible; min width). */
export const DOCUMENT_NAME_LINE_MIN_WIDTH_PX = 160;

/** @deprecated Use flexible name line in header row 2. */
export const DOCUMENT_NAME_LINE_WIDTH_PX = DOCUMENT_NAME_LINE_MIN_WIDTH_PX;

/** Writing line after „Imię i nazwisko” in exported PDF (pt) — row 2 uses flex. */
export const DOCUMENT_NAME_LINE_WIDTH_PT = 200;

export const DOCUMENT_NAME_LINE_COLOR = "#d4d4d8";

/** Header row 1 — „Data:” starts near page center; writing widths. */
export const DOCUMENT_HEADER_DATE_START_PERCENT = 50;
export const DOCUMENT_HEADER_DATE_LINE_WIDTH = "3cm";
export const DOCUMENT_HEADER_DATE_LINE_WIDTH_PT = 85;
export const DOCUMENT_HEADER_CLASS_LINE_WIDTH = "2cm";
export const DOCUMENT_HEADER_CLASS_LINE_WIDTH_PT = 57;
export const DOCUMENT_HEADER_TOTAL_POINTS_MARGIN_RIGHT = "1.25cm";
export const DOCUMENT_HEADER_TOTAL_POINTS_MARGIN_RIGHT_PT = 35;
/** Writing line before „/ max” in the total-points field. */
export const DOCUMENT_HEADER_TOTAL_POINTS_LINE_WIDTH = "1.7cm";
export const DOCUMENT_HEADER_GROUP_LINE_WIDTH = "1.5cm";
export const DOCUMENT_HEADER_GROUP_LINE_WIDTH_PT = 43;

/** Student instructions — smaller italic text below header. */
export const DOCUMENT_INSTRUCTIONS_FONT_SIZE_REM = 0.875;
export const DOCUMENT_INSTRUCTIONS_FONT_SIZE_PT = 10;
export const DOCUMENT_INSTRUCTIONS_MARGIN_BOTTOM = "7mm";
export const DOCUMENT_INSTRUCTIONS_MARGIN_BOTTOM_PT = 20;

export const GROUP_OPTIONS = ["A", "B", "C", "D"] as const;

export const DEFAULT_STUDENT_INSTRUCTIONS =
  "Zapisz wszystkie obliczenia i odpowiedzi. Wynik podaj w najprostszej, skróconej postaci. Usuń niewymierność z mianownika.";

export type DocumentGroupVersion = {
  group: string;
  /** When null, use each task row's variantIndex. */
  variantIndex: number | null;
};

export function sortSelectedGroups(groups: string[]): string[] {
  return GROUP_OPTIONS.filter((option) => groups.includes(option));
}

export function groupVariantIndex(group: string): number {
  const index = GROUP_OPTIONS.indexOf(
    group as (typeof GROUP_OPTIONS)[number]
  );
  return index >= 0 ? index : 0;
}

export function resolveDocumentGroupVersions(
  display: DocumentDisplayOptions
): DocumentGroupVersion[] {
  const selected = sortSelectedGroups(display.selectedGroups);

  if (selected.length === 0) {
    return [{ group: "", variantIndex: null }];
  }

  return selected.map((group) => ({
    group,
    variantIndex: groupVariantIndex(group),
  }));
}

export function displayForDocumentVersion(
  display: DocumentDisplayOptions,
  group: string
): DocumentDisplayOptions {
  return {
    ...display,
    group,
  };
}

export function resolveItemVariantIndex(
  item: DocumentTaskItem,
  version: DocumentGroupVersion
): number {
  return version.variantIndex ?? item.variantIndex;
}

export function isDocumentTaskItem(
  item: DocumentItem
): item is DocumentTaskItem {
  return item.kind === "task";
}

export function isDocumentAnswerAreaItem(
  item: DocumentItem
): item is DocumentAnswerAreaItem {
  return item.kind === "answer-area";
}

export const ANSWER_AREA_ITEM_TYPE_OPTIONS: Array<{
  value: AnswerAreaItemType;
  label: string;
}> = [
  { value: "blank", label: "Puste" },
  { value: "lines", label: "Linie" },
  { value: "grid", label: "Kratka (5 mm)" },
];

export const ANSWER_AREA_TYPE_OPTIONS = ANSWER_AREA_ITEM_TYPE_OPTIONS;



export const ANSWER_HEIGHT_OPTIONS: Array<{

  value: AnswerAreaHeight;

  label: string;

}> = [

  { value: "2cm", label: "2 cm" },

  { value: "3cm", label: "3 cm" },

  { value: "4cm", label: "4 cm" },

  { value: "5cm", label: "5 cm" },

  { value: "6cm", label: "6 cm" },

];



export const DOCUMENT_TYPES: {
  value: DocumentType;
  label: string;
}[] = [
  { value: "kartkowka", label: "Kartkówka" },
  { value: "sprawdzian", label: "Sprawdzian" },
];



export const CM_TO_PT = 28.3465;

export const DOCUMENT_HEADER_TOTAL_POINTS_LINE_WIDTH_PT = Math.round(
  1.7 * CM_TO_PT
);



export const ANSWER_HEIGHT_PT: Record<

  Exclude<AnswerAreaHeight, "full-page">,

  number

> = {

  "1cm": CM_TO_PT,

  "2cm": 2 * CM_TO_PT,

  "3cm": 3 * CM_TO_PT,

  "4cm": 4 * CM_TO_PT,

  "5cm": 5 * CM_TO_PT,

  "6cm": 6 * CM_TO_PT,

};



export const FULL_PAGE_ANSWER_HEIGHT_PT = 680;



export const GRID_STEP_MM = 6.5;

export const GRID_STEP_PT = CM_TO_PT * 0.65;

export const GRID_5MM_STEP_PT = GRID_STEP_PT;

export const GRID_10MM_STEP_PT = CM_TO_PT;

export const LINE_STEP_PT = 18;



/** Preview pixels at ~96 dpi (matches PDF proportions). */

export const ANSWER_HEIGHT_PX: Record<

  Exclude<AnswerAreaHeight, "full-page">,

  number

> = {

  "1cm": 38,

  "2cm": 76,

  "3cm": 114,

  "4cm": 152,

  "5cm": 190,

  "6cm": 228,

};



export const FULL_PAGE_ANSWER_HEIGHT_PX = 900;

export const GRID_STEP_PX = 32;

export const GRID_5MM_STEP_PX = GRID_STEP_PX;

export const GRID_10MM_STEP_PX = 38;

export const LINE_STEP_PX = 18;



export const ANSWER_GRID_LINE_COLOR = "rgba(0, 0, 0, 0.085)";

export const ANSWER_GRID_LINE_COLOR_PDF = "#d6d6d6";

export const ANSWER_LINE_COLOR = "#e4e4e7";

export const ANSWER_AREA_MIN_HEIGHT_PX = ANSWER_HEIGHT_PX["2cm"];

export const ANSWER_AREA_MAX_HEIGHT_PX = 520;



export function cmToAnswerAreaPx(cm: number): number {

  return Math.round(cm * ANSWER_HEIGHT_PX["1cm"]);

}



export function pxToAnswerAreaCm(px: number): number {

  return Math.round((px / ANSWER_HEIGHT_PX["1cm"]) * 10) / 10;

}



export function resolveAnswerAreaItemHeightPx(

  item: DocumentAnswerAreaItem

): number {

  if (item.heightPx != null) {

    return Math.max(

      ANSWER_AREA_MIN_HEIGHT_PX,

      Math.min(ANSWER_AREA_MAX_HEIGHT_PX, Math.round(item.heightPx))

    );

  }



  return cmToAnswerAreaPx(item.heightCm);

}



export function resolveAnswerAreaItemHeightCm(

  item: DocumentAnswerAreaItem

): number {

  if (item.heightPx != null) {

    return pxToAnswerAreaCm(item.heightPx);

  }



  return item.heightCm;

}



export function defaultDocumentDisplayOptions(): DocumentDisplayOptions {
  return {

    showTitle: true,

    showDate: true,

    showStudentName: true,

    showClass: false,

    showGroup: false,

    showTotalPoints: false,

    showStudentInstructions: false,

    date: "",

    className: "",

    group: "",

    selectedGroups: [],

    studentInstructions: DEFAULT_STUDENT_INSTRUCTIONS,

    totalPoints: "",

    totalPointsCustomized: false,

    renumberSelectedSubtasks: true,

  };

}



export function formatDocumentTotalPointsLabel(totalPoints: string): string {

  const trimmed = totalPoints.trim();

  return trimmed ? `Suma pkt: ${trimmed}` : "Suma pkt:";

}

export function extractDocumentTotalPointsMax(
  totalPoints: string,
  calculatedMax: number
): string {
  const trimmed = totalPoints.trim();
  const slashMatch = trimmed.match(/\/\s*(\d+)\s*$/);

  if (slashMatch) {
    return slashMatch[1];
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return String(calculatedMax);
}

export function calculateDocumentTaskPoints(
  items: DocumentItem[],
  resolveTaskPoints: (taskId: string) => number | undefined
): number {
  return items.reduce((sum, item) => {
    if (!isDocumentTaskItem(item)) {
      return sum;
    }

    return sum + (resolveTaskPoints(item.taskId) ?? 0);
  }, 0);
}



export function normalizeAnswerArea(value: unknown): AnswerAreaType {

  if (

    value === "blank" ||

    value === "grid" ||

    value === "grid-5mm" ||

    value === "grid-10mm" ||

    value === "lines"

  ) {

    if (value === "grid-5mm" || value === "grid-10mm") {

      return "grid";

    }

    return value;

  }



  return "none";

}



export function normalizeAnswerHeight(value: unknown): AnswerAreaHeight {

  if (

    value === "2cm" ||

    value === "3cm" ||

    value === "4cm" ||

    value === "5cm" ||

    value === "6cm" ||

    value === "1cm" ||

    value === "full-page"

  ) {

    return value;

  }



  return "3cm";

}



export function answerAreaStyleKey(

  answerArea: AnswerAreaType | AnswerAreaItemType

): "none" | "blank" | "lines" | "grid" {

  if (answerArea === "blank") {

    return "blank";

  }



  if (answerArea === "lines") {

    return "lines";

  }



  if (

    answerArea === "grid" ||

    answerArea === "grid-5mm" ||

    answerArea === "grid-10mm"

  ) {

    return "grid";

  }



  return "none";

}



export function isAnswerAreaEnabled(

  answerArea: AnswerAreaType | AnswerAreaItemType

): boolean {

  return answerArea !== "none";

}



export function createDocumentTaskItem(

  taskId: string,

  variantIndex: number,

  selectedSubtasks?: string[]

): DocumentTaskItem {

  const item: DocumentTaskItem = {

    kind: "task",

    entryId: crypto.randomUUID(),

    taskId,

    variantIndex,

  };

  if (selectedSubtasks && selectedSubtasks.length > 0) {

    item.selectedSubtasks = selectedSubtasks;

  }

  return item;

}



/** @deprecated Use createDocumentTaskItem */

export const createDocumentTaskRef = createDocumentTaskItem;



export function createDocumentAnswerAreaItem(): DocumentAnswerAreaItem {

  return {

    kind: "answer-area",

    entryId: crypto.randomUUID(),

    areaType: "blank",

    heightCm: 3,

    heightPx: null,

  };

}



export function moveItem<T>(

  items: T[],

  index: number,

  direction: -1 | 1

): T[] {

  const target = index + direction;



  if (target < 0 || target >= items.length) {

    return items;

  }



  const next = [...items];

  const [item] = next.splice(index, 1);

  next.splice(target, 0, item);

  return next;

}


