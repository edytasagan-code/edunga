export const VARIANT_LABELS = ["A", "B", "C", "D"] as const;
export const MAX_VARIANTS = 4;

export type TaskVariantContent = {
  tresc: unknown;
  rozwiazanie: unknown;
  odpowiedz: unknown;
};

export type ZadanieVariantSource = {
  warianty?: unknown;
  tresc?: unknown;
  rozwiazanie?: unknown;
  odpowiedz?: unknown;
};

function isVariantContent(value: unknown): value is TaskVariantContent {
  return (
    typeof value === "object" &&
    value !== null &&
    "tresc" in value &&
    "rozwiazanie" in value &&
    "odpowiedz" in value
  );
}

export function normalizeVariants(
  data: ZadanieVariantSource
): TaskVariantContent[] {
  if (Array.isArray(data.warianty)) {
    const parsed = data.warianty
      .filter(isVariantContent)
      .slice(0, MAX_VARIANTS);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [
    {
      tresc: data.tresc ?? null,
      rozwiazanie: data.rozwiazanie ?? null,
      odpowiedz: data.odpowiedz ?? null,
    },
  ];
}

export function deepCloneVariantContent(
  variant: TaskVariantContent
): TaskVariantContent {
  return JSON.parse(JSON.stringify(variant));
}

export function variantLabel(index: number): string {
  return VARIANT_LABELS[index] ?? String(index + 1);
}
