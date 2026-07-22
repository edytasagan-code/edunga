export type DocumentType = "kartkowka" | "sprawdzian";

export type DocumentClass =
  | "1-lo"
  | "2-lo"
  | "3-lo"
  | "4-lo"
  | "cross-grade"
  | "matura";

export type DocumentLevel = "pp" | "pr" | "pp-pr";

export type DocumentProjectMetadata = {
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis?: string;
};

export const DOCUMENT_TYPE_OPTIONS: {
  value: DocumentType;
  label: string;
}[] = [
  { value: "kartkowka", label: "Kartkówka" },
  { value: "sprawdzian", label: "Sprawdzian" },
];

export const DOCUMENT_CLASS_OPTIONS: {
  value: DocumentClass;
  label: string;
}[] = [
  { value: "1-lo", label: "1 LO" },
  { value: "2-lo", label: "2 LO" },
  { value: "3-lo", label: "3 LO" },
  { value: "4-lo", label: "4 LO" },
  { value: "cross-grade", label: "Cross-grade" },
  { value: "matura", label: "Matura" },
];

export const DOCUMENT_LEVEL_OPTIONS: {
  value: DocumentLevel;
  label: string;
}[] = [
  { value: "pp", label: "PP" },
  { value: "pr", label: "PR" },
  { value: "pp-pr", label: "PP+PR" },
];

const DOCUMENT_TYPES = new Set<DocumentType>(["kartkowka", "sprawdzian"]);
const DOCUMENT_CLASSES = new Set<DocumentClass>([
  "1-lo",
  "2-lo",
  "3-lo",
  "4-lo",
  "cross-grade",
  "matura",
]);
const DOCUMENT_LEVELS = new Set<DocumentLevel>(["pp", "pr", "pp-pr"]);

const LEGACY_DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  test: "sprawdzian",
  quiz: "kartkowka",
  worksheet: "sprawdzian",
  homework: "sprawdzian",
};

export function defaultDocumentType(): DocumentType {
  return "sprawdzian";
}

export function defaultDocumentClass(): DocumentClass {
  return "3-lo";
}

export function defaultDocumentLevel(): DocumentLevel {
  return "pp";
}

export function defaultDocumentMetadata(): DocumentProjectMetadata {
  return {
    klasa: defaultDocumentClass(),
    poziom: defaultDocumentLevel(),
    opis: "",
  };
}

export function documentTypeLabel(value: string): string {
  const option = DOCUMENT_TYPE_OPTIONS.find(
    (entry) => entry.value === value
  );

  if (option) {
    return option.label;
  }

  const legacy = LEGACY_DOCUMENT_TYPE_MAP[value];

  if (legacy) {
    return documentTypeLabel(legacy);
  }

  return value;
}

export function documentClassLabel(value: string): string {
  return (
    DOCUMENT_CLASS_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function documentLevelLabel(value: string): string {
  return (
    DOCUMENT_LEVEL_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function parseDocumentType(value: unknown): DocumentType | null {
  if (typeof value !== "string") {
    return null;
  }

  if (DOCUMENT_TYPES.has(value as DocumentType)) {
    return value as DocumentType;
  }

  return LEGACY_DOCUMENT_TYPE_MAP[value] ?? null;
}

export function parseDocumentClass(value: unknown): DocumentClass | null {
  if (typeof value !== "string") {
    return null;
  }

  return DOCUMENT_CLASSES.has(value as DocumentClass)
    ? (value as DocumentClass)
    : null;
}

export function parseDocumentLevel(value: unknown): DocumentLevel | null {
  if (typeof value !== "string") {
    return null;
  }

  return DOCUMENT_LEVELS.has(value as DocumentLevel)
    ? (value as DocumentLevel)
    : null;
}

export function parseDocumentMetadata(
  record: {
    klasa?: unknown;
    poziom?: unknown;
    opis?: unknown;
  },
  fallback?: Partial<DocumentProjectMetadata>
): DocumentProjectMetadata {
  const klasa =
    parseDocumentClass(record.klasa) ??
    fallback?.klasa ??
    defaultDocumentClass();
  const poziom =
    parseDocumentLevel(record.poziom) ??
    fallback?.poziom ??
    defaultDocumentLevel();
  const opis =
    typeof record.opis === "string"
      ? record.opis
      : fallback?.opis ?? "";

  return {
    klasa,
    poziom,
    opis: opis.trim() || undefined,
  };
}

export function parseSaveDocumentForm(body: unknown): {
  tytul: string;
  typ: DocumentType;
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis?: string;
} | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const value = body as Record<string, unknown>;
  const typ = parseDocumentType(value.typ);
  const klasa = parseDocumentClass(value.klasa);
  const poziom = parseDocumentLevel(value.poziom);

  if (!typ || !klasa || !poziom) {
    return null;
  }

  const tytul =
    typeof value.tytul === "string" && value.tytul.trim()
      ? value.tytul.trim()
      : null;

  if (!tytul) {
    return null;
  }

  const opis =
    typeof value.opis === "string" && value.opis.trim()
      ? value.opis.trim()
      : undefined;

  return { tytul, typ, klasa, poziom, opis };
}
