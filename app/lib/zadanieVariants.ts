import { Prisma } from "@prisma/client";

import type { TaskVariantContent } from "./variants";
import { normalizeVariants } from "./variants";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function parseVariantsFromBody(body: {
  warianty?: unknown;
  tresc?: unknown;
  rozwiazanie?: unknown;
  odpowiedz?: unknown;
}): TaskVariantContent[] {
  if (Array.isArray(body.warianty) && body.warianty.length > 0) {
    return normalizeVariants({
      warianty: body.warianty,
      tresc: body.tresc,
      rozwiazanie: body.rozwiazanie,
      odpowiedz: body.odpowiedz,
    });
  }

  return normalizeVariants({
    tresc: body.tresc,
    rozwiazanie: body.rozwiazanie,
    odpowiedz: body.odpowiedz,
  });
}

export function primaryVariantFields(warianty: TaskVariantContent[]) {
  const first = warianty[0];

  return {
    tresc: toJson(first.tresc),
    rozwiazanie: toJson(first.rozwiazanie),
    odpowiedz: toJson(first.odpowiedz),
    warianty: toJson(warianty),
  };
}
