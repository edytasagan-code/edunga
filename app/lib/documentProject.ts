import type { Prisma } from "@prisma/client";

import {
  calculateDocumentTaskPoints,
  defaultDocumentDisplayOptions,
  isDocumentTaskItem,
  type DocumentDisplayOptions,
  type DocumentItem,
  type DocumentType,
  type GeneratorDocument,
} from "@/app/lib/documentGenerator";
import {
  defaultDocumentMetadata,
  documentClassLabel,
  documentLevelLabel,
  documentTypeLabel,
  parseDocumentClass,
  parseDocumentLevel,
  parseDocumentMetadata,
  parseDocumentType,
  type DocumentClass,
  type DocumentLevel,
  type DocumentProjectMetadata,
} from "@/app/lib/documentMetadata";
import {
  countDocumentTasks,
  defaultPrintLayoutOptions,
  normalizePrintLayout,
  type PrintLayoutOptions,
} from "@/app/lib/printLayout";

export type SavedDocumentRecord = {
  id: string;
  kod: string;
  tytul: string;
  typ: DocumentType;
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis?: string;
  wyswietlanie: DocumentDisplayOptions;
  ukladWydruku: PrintLayoutOptions;
  elementy: DocumentItem[];
  zarchiwizowany: boolean;
  autor: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentLibrarySummary = {
  id: string;
  kod: string;
  tytul: string;
  typ: DocumentType;
  typLabel: string;
  klasa: DocumentClass;
  klasaLabel: string;
  poziom: DocumentLevel;
  poziomLabel: string;
  totalPoints: number;
  estimatedMinutes: number;
  zarchiwizowany: boolean;
  updatedAt: string;
};

export type DocumentWritePayload = {
  tytul: string;
  typ: DocumentType;
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis?: string;
  wyswietlanie: DocumentDisplayOptions;
  ukladWydruku: PrintLayoutOptions;
  elementy: DocumentItem[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function calculateDocumentTaskMinutes(
  items: DocumentItem[],
  resolveTaskMinutes: (taskId: string) => number | undefined
): number {
  return items.reduce((sum, item) => {
    if (!isDocumentTaskItem(item)) {
      return sum;
    }

    return sum + (resolveTaskMinutes(item.taskId) ?? 0);
  }, 0);
}

export function extractTaskIdsFromItems(items: DocumentItem[]): string[] {
  return [
    ...new Set(
      items
        .filter(isDocumentTaskItem)
        .map((item) => item.taskId)
        .filter(Boolean)
    ),
  ];
}

export function serializeDisplayForStorage(
  display: DocumentDisplayOptions
): Omit<DocumentDisplayOptions, "group"> {
  const { group: _group, ...rest } = display;

  return rest;
}

function parseSubtaskGridOffsets(
  value: unknown
): Record<string, number> | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const offsets: Record<string, number> = {};

  for (const [label, offset] of Object.entries(value)) {
    if (typeof offset !== "number" || !Number.isFinite(offset)) {
      continue;
    }

    offsets[label.toLowerCase()] = Math.max(0, Math.round(offset));
  }

  return Object.keys(offsets).length > 0 ? offsets : undefined;
}

export function parseDocumentItems(value: unknown): DocumentItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: DocumentItem[] = [];

  for (const raw of value) {
    if (!isObject(raw) || typeof raw.entryId !== "string") {
      continue;
    }

    if (raw.kind === "task") {
      if (typeof raw.taskId !== "string") {
        continue;
      }

      const variantIndex =
        typeof raw.variantIndex === "number" ? raw.variantIndex : 0;

      const item: DocumentItem = {
        kind: "task",
        entryId: raw.entryId,
        taskId: raw.taskId,
        variantIndex,
      };

      if (Array.isArray(raw.selectedSubtasks)) {
        const selected = raw.selectedSubtasks.filter(
          (label): label is string => typeof label === "string"
        );

        if (selected.length > 0) {
          item.selectedSubtasks = selected.map((label) => label.toLowerCase());
        }
      }

      const offsets = parseSubtaskGridOffsets(raw.subtaskGridOffsets);

      if (offsets) {
        item.subtaskGridOffsets = offsets;
      }

      items.push(item);
      continue;
    }

    if (raw.kind === "answer-area") {
      if (
        raw.areaType !== "blank" &&
        raw.areaType !== "lines" &&
        raw.areaType !== "grid"
      ) {
        continue;
      }

      items.push({
        kind: "answer-area",
        entryId: raw.entryId,
        areaType: raw.areaType,
        heightCm: typeof raw.heightCm === "number" ? raw.heightCm : 3,
        heightPx:
          typeof raw.heightPx === "number" || raw.heightPx === null
            ? raw.heightPx
            : null,
      });
    }
  }

  return items;
}

export function parseDisplayOptions(value: unknown): DocumentDisplayOptions {
  const defaults = defaultDocumentDisplayOptions();

  if (!isObject(value)) {
    return defaults;
  }

  return {
    ...defaults,
    showTitle: Boolean(value.showTitle ?? defaults.showTitle),
    showDate: Boolean(value.showDate ?? defaults.showDate),
    showStudentName: Boolean(
      value.showStudentName ?? defaults.showStudentName
    ),
    showClass: Boolean(value.showClass ?? defaults.showClass),
    showGroup: Boolean(value.showGroup ?? defaults.showGroup),
    showTotalPoints: Boolean(
      value.showTotalPoints ?? defaults.showTotalPoints
    ),
    showStudentInstructions: Boolean(
      value.showStudentInstructions ?? defaults.showStudentInstructions
    ),
    date: typeof value.date === "string" ? value.date : defaults.date,
    className:
      typeof value.className === "string" ? value.className : defaults.className,
    group: "",
    selectedGroups: Array.isArray(value.selectedGroups)
      ? value.selectedGroups.filter(
          (group): group is string => typeof group === "string"
        )
      : defaults.selectedGroups,
    studentInstructions:
      typeof value.studentInstructions === "string"
        ? value.studentInstructions
        : defaults.studentInstructions,
    totalPoints:
      typeof value.totalPoints === "string"
        ? value.totalPoints
        : defaults.totalPoints,
    totalPointsCustomized: Boolean(
      value.totalPointsCustomized ?? defaults.totalPointsCustomized
    ),
    renumberSelectedSubtasks: Boolean(
      value.renumberSelectedSubtasks ?? defaults.renumberSelectedSubtasks
    ),
  };
}

export function parsePrintLayoutOptions(value: unknown): PrintLayoutOptions {
  const defaults = defaultPrintLayoutOptions();

  if (!isObject(value)) {
    return defaults;
  }

  const grid =
    typeof value.grid === "string" ? value.grid : defaults.grid;

  return normalizePrintLayout(
    {
      grid: grid as PrintLayoutOptions["grid"],
      duplex: Boolean(value.duplex ?? defaults.duplex),
      splitAfterTask:
        typeof value.splitAfterTask === "number"
          ? value.splitAfterTask
          : defaults.splitAfterTask,
      showCutLines: Boolean(value.showCutLines ?? defaults.showCutLines),
      showCropMarks: Boolean(value.showCropMarks ?? defaults.showCropMarks),
    },
    1
  );
}

export function savedDocumentFromDb(record: {
  id: string;
  kod: string;
  tytul: string;
  typ: string;
  klasa?: string;
  poziom?: string;
  opis?: string | null;
  wyswietlanie: unknown;
  ukladWydruku: unknown;
  elementy: unknown;
  zarchiwizowany: boolean;
  autor: string;
  createdAt: Date;
  updatedAt: Date;
}): SavedDocumentRecord | null {
  const typ = parseDocumentType(record.typ);

  if (!typ) {
    return null;
  }

  const metadata = parseDocumentMetadata(record);
  const elementy = parseDocumentItems(record.elementy);

  return {
    id: record.id,
    kod: record.kod,
    tytul: record.tytul,
    typ,
    klasa: metadata.klasa,
    poziom: metadata.poziom,
    opis: metadata.opis,
    wyswietlanie: parseDisplayOptions(record.wyswietlanie),
    ukladWydruku: parsePrintLayoutOptions(record.ukladWydruku),
    elementy,
    zarchiwizowany: record.zarchiwizowany,
    autor: record.autor,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function generatorDocumentFromRecord(
  record: SavedDocumentRecord
): GeneratorDocument {
  const taskCount = countDocumentTasks(record.elementy);

  return {
    title: record.tytul,
    type: record.typ,
    display: parseDisplayOptions(record.wyswietlanie),
    printLayout: normalizePrintLayout(record.ukladWydruku, taskCount),
    items: record.elementy,
  };
}

export function buildDocumentWritePayload(
  document: GeneratorDocument,
  metadata: DocumentProjectMetadata = defaultDocumentMetadata()
): DocumentWritePayload {
  const taskCount = countDocumentTasks(document.items);

  return {
    tytul: document.title.trim() || "Bez tytułu",
    typ: document.type,
    klasa: metadata.klasa,
    poziom: metadata.poziom,
    opis: metadata.opis?.trim() || undefined,
    wyswietlanie: parseDisplayOptions(
      serializeDisplayForStorage(document.display)
    ),
    ukladWydruku: normalizePrintLayout(document.printLayout, taskCount),
    elementy: document.items,
  };
}

export function documentWritePayloadToPrismaData(payload: DocumentWritePayload): {
  tytul: string;
  typ: DocumentType;
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis: string | null;
  wyswietlanie: Prisma.InputJsonValue;
  ukladWydruku: Prisma.InputJsonValue;
  elementy: Prisma.InputJsonValue;
} {
  return {
    tytul: payload.tytul,
    typ: payload.typ,
    klasa: payload.klasa,
    poziom: payload.poziom,
    opis: payload.opis ?? null,
    wyswietlanie: toJson(payload.wyswietlanie),
    ukladWydruku: toJson(payload.ukladWydruku),
    elementy: toJson(payload.elementy),
  };
}

export function buildDocumentLibrarySummary(
  record: SavedDocumentRecord,
  taskMeta: Map<string, { punkty: number; czas: number }>
): DocumentLibrarySummary {
  const resolveMeta = (taskId: string) => taskMeta.get(taskId);

  return {
    id: record.id,
    kod: record.kod,
    tytul: record.tytul,
    typ: record.typ,
    typLabel: documentTypeLabel(record.typ),
    klasa: record.klasa,
    klasaLabel: documentClassLabel(record.klasa),
    poziom: record.poziom,
    poziomLabel: documentLevelLabel(record.poziom),
    totalPoints: calculateDocumentTaskPoints(record.elementy, (taskId) =>
      resolveMeta(taskId)?.punkty
    ),
    estimatedMinutes: calculateDocumentTaskMinutes(record.elementy, (taskId) =>
      resolveMeta(taskId)?.czas
    ),
    zarchiwizowany: record.zarchiwizowany,
    updatedAt: record.updatedAt,
  };
}

export function parseDocumentWriteBody(body: unknown): DocumentWritePayload | null {
  if (!isObject(body)) {
    return null;
  }

  const typ = parseDocumentType(body.typ);
  const klasa = parseDocumentClass(body.klasa);
  const poziom = parseDocumentLevel(body.poziom);

  if (!typ || !klasa || !poziom) {
    return null;
  }

  const elementy = parseDocumentItems(body.elementy);
  const taskCount = countDocumentTasks(elementy);

  const opis =
    typeof body.opis === "string" && body.opis.trim()
      ? body.opis.trim()
      : undefined;

  return {
    tytul:
      typeof body.tytul === "string" && body.tytul.trim()
        ? body.tytul.trim()
        : "Bez tytułu",
    typ,
    klasa,
    poziom,
    opis,
    wyswietlanie: parseDisplayOptions(body.wyswietlanie),
    ukladWydruku: normalizePrintLayout(
      parsePrintLayoutOptions(body.ukladWydruku),
      taskCount
    ),
    elementy,
  };
}

export {
  defaultDocumentMetadata,
  documentClassLabel,
  documentLevelLabel,
  documentTypeLabel,
  type DocumentClass,
  type DocumentLevel,
  type DocumentProjectMetadata,
};
