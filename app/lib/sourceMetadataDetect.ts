import {
  EMPTY_SOURCE_METADATA,
  normalizeSourceMetadata,
  type SourceMetadata,
} from "@/app/lib/sourceMetadata";
import type { TaskSourceValue } from "@/app/lib/taskSource";
import { isTaskSourceValue } from "@/app/lib/taskSource";
import type { ImportSessionMetadata } from "@/app/lib/import/types";

function detectSourceFromText(text: string): TaskSourceValue | null {
  const sample = text.slice(0, 4000).toLowerCase();

  if (
    /egzamin\s+ósmoklasisty|egzamin\s+osmoklasisty|egzamin\s+8-klasisty/.test(
      sample
    )
  ) {
    return "egzamin-osmoklasisty";
  }

  if (
    /matura\s+z\s+matematyki|egzamin\s+matur|arkusz\s+matur|centralna\s+komisja\s+egzaminacyjna|\bcke\b/.test(
      sample
    )
  ) {
    return "matura";
  }

  return null;
}

function detectSourceFromFileName(fileName: string): TaskSourceValue | null {
  const lower = fileName.toLowerCase();

  if (/ósmoklas|osmoklas|8-klas|egzamin.?8/.test(lower)) {
    return "egzamin-osmoklasisty";
  }

  if (/matura|m20\d{2}|mat\.?20\d{2}/.test(lower)) {
    return "matura";
  }

  if (/pazdro/.test(lower)) {
    return "pazdro";
  }

  if (/cke/.test(lower)) {
    return "matura";
  }

  return null;
}

function detectYear(text: string): number | null {
  const match = text.match(/\b(20(?:1\d|2\d))\b/);

  if (!match?.[1]) {
    return null;
  }

  const year = Number(match[1]);

  return Number.isFinite(year) ? year : null;
}

function detectSession(text: string): string | null {
  const lower = text.toLowerCase();

  if (/\bmaj\b|termin\s+majowy/.test(lower)) {
    return "maj";
  }

  if (/\bczerwiec\b|termin\s+czerwcowy/.test(lower)) {
    return "czerwiec";
  }

  if (/\bsierpie[nń]\b|termin\s+sierpniowy|sesja\s+dodatkowa/.test(lower)) {
    return "sierpien";
  }

  if (/egzamin\s+pr[oó]bny|\bpr[oó]bna\b/.test(lower)) {
    return "probna";
  }

  if (/sesja\s+dodatkowa/.test(lower)) {
    return "dodatkowa";
  }

  return null;
}

function detectExamLevel(text: string): string | null {
  const lower = text.toLowerCase();

  if (
    /\bpoziom\s+podstawowy\b|\bp\.?\s*p\.?\b|\bpp\b(?![a-z])|podstawow/.test(
      lower
    )
  ) {
    return "pp";
  }

  if (
    /\bpoziom\s+rozszerzony\b|\bp\.?\s*r\.?\b|\bpr\b(?![a-z])|rozszerzon/.test(
      lower
    )
  ) {
    return "pr";
  }

  return null;
}

export function detectSourceMetadataFromImport(
  fileName: string,
  rawText = ""
): Partial<ImportSessionMetadata> {
  const combined = `${fileName}\n${rawText.slice(0, 6000)}`;
  const zrodlo =
    detectSourceFromFileName(fileName) ?? detectSourceFromText(rawText);

  const sourceMetadata: SourceMetadata = normalizeSourceMetadata({
    rokEgzaminu: detectYear(combined),
    sesjaEgzaminu: detectSession(combined),
    poziomEgzaminu: detectExamLevel(combined),
  });

  const patch: Partial<ImportSessionMetadata> = {
    sourceMetadata,
  };

  if (zrodlo && isTaskSourceValue(zrodlo)) {
    patch.zrodlo = zrodlo;
  }

  if (
    !sourceMetadata.rokEgzaminu &&
    !sourceMetadata.sesjaEgzaminu &&
    !sourceMetadata.poziomEgzaminu
  ) {
    patch.sourceMetadata = { ...EMPTY_SOURCE_METADATA };
  }

  return patch;
}
