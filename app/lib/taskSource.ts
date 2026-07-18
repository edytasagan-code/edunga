export const TASK_SOURCE_OPTIONS = [
  { value: "own", label: "Own" },
  { value: "pazdro", label: "Pazdro" },
  { value: "nowa-era", label: "Nowa Era" },
  { value: "operon", label: "Operon" },
  { value: "cke", label: "CKE" },
  { value: "matura", label: "Matura" },
  { value: "egzamin-osmoklasisty", label: "Egzamin Ósmoklasisty" },
  { value: "other", label: "Other" },
] as const;

export type TaskSourceValue =
  (typeof TASK_SOURCE_OPTIONS)[number]["value"];

const SOURCE_VALUES = new Set<string>(
  TASK_SOURCE_OPTIONS.map((option) => option.value)
);

export function isTaskSourceValue(
  value: string
): value is TaskSourceValue {
  return SOURCE_VALUES.has(value);
}

export function taskSourceLabel(value: unknown): string {
  const normalized = normalizeTaskSource(value);

  if (!normalized) {
    return "—";
  }

  const option = TASK_SOURCE_OPTIONS.find(
    (item) => item.value === normalized
  );

  return option?.label ?? normalized;
}

export function normalizeTaskSource(
  value: unknown
): TaskSourceValue | "" {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  return isTaskSourceValue(value) ? value : "";
}

export function normalizeTaskIdentifier(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 64);
}
