import type { TaskSourceValue } from "@/app/lib/taskSource";

export type SourceMetadataFieldKey =
  | "rokEgzaminu"
  | "sesjaEgzaminu"
  | "poziomEgzaminu";

export type SourceMetadata = {
  rokEgzaminu: number | null;
  sesjaEgzaminu: string | null;
  poziomEgzaminu: string | null;
};

export const EMPTY_SOURCE_METADATA: SourceMetadata = {
  rokEgzaminu: null,
  sesjaEgzaminu: null,
  poziomEgzaminu: null,
};

export type SourceMetadataFieldDefinition = {
  key: SourceMetadataFieldKey;
  label: string;
  kind: "number" | "select";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
};

export const EXAM_SESSION_OPTIONS = [
  { value: "maj", label: "Maj" },
  { value: "czerwiec", label: "Czerwiec" },
  { value: "sierpien", label: "Sierpień" },
  { value: "probna", label: "Egzamin próbny" },
  { value: "dodatkowa", label: "Sesja dodatkowa" },
  { value: "inna", label: "Inna" },
] as const;

export const EXAM_LEVEL_OPTIONS = [
  { value: "pp", label: "PP (poziom podstawowy)" },
  { value: "pr", label: "PR (poziom rozszerzony)" },
] as const;

const SOURCE_METADATA_FIELDS: Partial<
  Record<TaskSourceValue, SourceMetadataFieldDefinition[]>
> = {
  matura: [
    {
      key: "rokEgzaminu",
      label: "Rok",
      kind: "number",
      placeholder: "np. 2026",
      min: 2000,
      max: 2100,
    },
    {
      key: "sesjaEgzaminu",
      label: "Sesja",
      kind: "select",
      options: [...EXAM_SESSION_OPTIONS],
    },
    {
      key: "poziomEgzaminu",
      label: "Poziom",
      kind: "select",
      options: [...EXAM_LEVEL_OPTIONS],
    },
  ],
  "egzamin-osmoklasisty": [
    {
      key: "rokEgzaminu",
      label: "Rok",
      kind: "number",
      placeholder: "np. 2025",
      min: 2000,
      max: 2100,
    },
    {
      key: "sesjaEgzaminu",
      label: "Sesja",
      kind: "select",
      options: [...EXAM_SESSION_OPTIONS],
    },
  ],
};

export function getSourceMetadataFields(
  zrodlo: string | null | undefined
): SourceMetadataFieldDefinition[] {
  if (!zrodlo) {
    return [];
  }

  return SOURCE_METADATA_FIELDS[zrodlo as TaskSourceValue] ?? [];
}

export function sourceMetadataHasFields(
  zrodlo: string | null | undefined
): boolean {
  return getSourceMetadataFields(zrodlo).length > 0;
}

export function normalizeSourceMetadata(
  value: Partial<SourceMetadata> | null | undefined
): SourceMetadata {
  const rok =
    value?.rokEgzaminu == null || Number.isNaN(Number(value.rokEgzaminu))
      ? null
      : Math.trunc(Number(value.rokEgzaminu));

  return {
    rokEgzaminu: rok,
    sesjaEgzaminu: value?.sesjaEgzaminu?.trim() || null,
    poziomEgzaminu: value?.poziomEgzaminu?.trim() || null,
  };
}

export function sanitizeSourceMetadataForSource(
  zrodlo: string | null | undefined,
  metadata: SourceMetadata
): SourceMetadata {
  const allowed = new Set(
    getSourceMetadataFields(zrodlo).map((field) => field.key)
  );

  return {
    rokEgzaminu: allowed.has("rokEgzaminu") ? metadata.rokEgzaminu : null,
    sesjaEgzaminu: allowed.has("sesjaEgzaminu")
      ? metadata.sesjaEgzaminu
      : null,
    poziomEgzaminu: allowed.has("poziomEgzaminu")
      ? metadata.poziomEgzaminu
      : null,
  };
}

export function mergeSourceMetadata(
  base: SourceMetadata,
  patch?: Partial<SourceMetadata> | null
): SourceMetadata {
  if (!patch) {
    return { ...base };
  }

  return normalizeSourceMetadata({
    rokEgzaminu:
      patch.rokEgzaminu !== undefined ? patch.rokEgzaminu : base.rokEgzaminu,
    sesjaEgzaminu:
      patch.sesjaEgzaminu !== undefined
        ? patch.sesjaEgzaminu
        : base.sesjaEgzaminu,
    poziomEgzaminu:
      patch.poziomEgzaminu !== undefined
        ? patch.poziomEgzaminu
        : base.poziomEgzaminu,
  });
}

export function sourceMetadataDiffers(
  left: SourceMetadata,
  right: SourceMetadata
): boolean {
  return (
    left.rokEgzaminu !== right.rokEgzaminu ||
    left.sesjaEgzaminu !== right.sesjaEgzaminu ||
    left.poziomEgzaminu !== right.poziomEgzaminu
  );
}

export function examSessionLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return (
    EXAM_SESSION_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function examLevelLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return (
    EXAM_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}
