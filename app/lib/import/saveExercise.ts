import type { ExerciseLevel, ImportSessionMetadata, ParsedExercise } from "./types";
import { buildExerciseTags } from "./levelDetect";
import {
  formatCkeExerciseDisplayNumber,
  formatCkeIdentifierPreviewLine,
} from "./ckeIdentifier";
import {
  normalizeParsedExercisePazdroIdentifiers,
} from "./pazdroIdentifier";
import { formatPazdroIdentifierPreviewLines } from "./visionNormalize";
import { normalizeTaskIdentifier } from "@/app/lib/taskSource";

function normalizeExerciseForSave(
  metadata: ImportSessionMetadata,
  exercise: Pick<
    ParsedExercise,
    | "index"
    | "number"
    | "identifikatorPp"
    | "identifikatorPr"
    | "identifikatorZrodla"
  >,
  siblings?: ParsedExercise[]
): Pick<
  ParsedExercise,
  "number" | "identifikatorPp" | "identifikatorPr" | "identifikatorZrodla"
> {
  if (metadata.zrodlo === "matura") {
    return {
      number: exercise.number,
      identifikatorPp: null,
      identifikatorPr: null,
      identifikatorZrodla: exercise.identifikatorZrodla ?? null,
    };
  }

  if (metadata.zrodlo !== "pazdro") {
    return {
      number: exercise.number,
      identifikatorPp: exercise.identifikatorPp ?? null,
      identifikatorPr: exercise.identifikatorPr ?? null,
      identifikatorZrodla: null,
    };
  }

  const normalized = siblings
    ? normalizeParsedExercisePazdroIdentifiers(
        exercise as ParsedExercise,
        siblings
      )
    : (exercise as ParsedExercise);

  const pp = normalizeTaskIdentifier(normalized.identifikatorPp);
  const pr = normalizeTaskIdentifier(normalized.identifikatorPr);
  const number = normalizeTaskIdentifier(normalized.number);

  return {
    number: number || normalized.number,
    identifikatorPp: pp || null,
    identifikatorPr: pr || null,
    identifikatorZrodla: null,
  };
}

export function resolveExerciseIdentyfikator(
  metadata: ImportSessionMetadata,
  exercise: Pick<
    ParsedExercise,
    | "index"
    | "number"
    | "identifikatorPp"
    | "identifikatorPr"
    | "identifikatorZrodla"
  >,
  siblings?: ParsedExercise[]
): string | null {
  if (metadata.zrodlo === "matura") {
    return (
      normalizeTaskIdentifier(exercise.identifikatorZrodla) || null
    );
  }

  const ids = normalizeExerciseForSave(metadata, exercise, siblings);
  const pp = normalizeTaskIdentifier(ids.identifikatorPp);
  const pr = normalizeTaskIdentifier(ids.identifikatorPr);

  if (pp || pr) {
    return null;
  }

  if (ids.number?.trim()) {
    if (metadata.zrodlo === "pazdro") {
      return null;
    }

    return [metadata.identyfikatorPrefix, ids.number]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return metadata.identyfikatorPrefix?.trim() || null;
}

export function buildImportedTaskPayload(
  metadata: ImportSessionMetadata,
  exercise: Pick<
    ParsedExercise,
    | "index"
    | "number"
    | "level"
    | "poziom"
    | "punkty"
    | "czas"
    | "tresc"
    | "rozwiazanie"
    | "odpowiedz"
    | "identifikatorPp"
    | "identifikatorPr"
    | "identifikatorZrodla"
  >,
  siblings?: ParsedExercise[]
) {
  const ids = normalizeExerciseForSave(metadata, exercise, siblings);

  return {
    klasaId: metadata.klasaId,
    dzialId: metadata.dzialId,
    tematId: metadata.tematId,
    typ: metadata.typ || "otwarte",
    poziom: exercise.poziom ?? 0,
    punkty: exercise.punkty ?? 0,
    czas: exercise.czas ?? 0,
    zrodlo: metadata.zrodlo,
    identyfikator: resolveExerciseIdentyfikator(metadata, exercise, siblings),
    identifikatorPp: ids.identifikatorPp,
    identifikatorPr: ids.identifikatorPr,
    rokEgzaminu: metadata.sourceMetadata.rokEgzaminu,
    sesjaEgzaminu: metadata.sourceMetadata.sesjaEgzaminu,
    poziomEgzaminu: metadata.sourceMetadata.poziomEgzaminu,
    tagi: buildExerciseTags(exercise.level),
    warianty: [
      {
        tresc: exercise.tresc,
        rozwiazanie: exercise.rozwiazanie,
        odpowiedz: exercise.odpowiedz,
      },
    ],
  };
}

export function exerciseLevelLabel(level: ExerciseLevel | null): string {
  if (level === "basic") {
    return "Podstawowy";
  }

  if (level === "extended") {
    return "Rozszerzony";
  }

  return "Nieznany";
}

export function formatExerciseCardTitle(
  exercise: Pick<ParsedExercise, "number" | "index">,
  zrodlo?: string | null
): string {
  const fallbackNumber = exercise.number ?? String(exercise.index + 1);

  if (zrodlo === "matura") {
    return formatCkeExerciseDisplayNumber(fallbackNumber);
  }

  return `Zadanie ${fallbackNumber}`;
}

export function formatExerciseMetadataLine(
  exercise: Pick<
    ParsedExercise,
    "number" | "identifikatorPp" | "identifikatorPr" | "identifikatorZrodla"
  >,
  sourceLabel?: string | null,
  zrodlo?: string | null
): string | null {
  if (zrodlo === "matura") {
    const identifier = formatCkeIdentifierPreviewLine(
      exercise.identifikatorZrodla
    );

    if (!identifier) {
      return sourceLabel?.trim() || null;
    }

    return sourceLabel?.trim()
      ? `${sourceLabel.trim()} · ${identifier}`
      : identifier;
  }

  const parts: string[] = [];
  const pp = normalizeTaskIdentifier(exercise.identifikatorPp);
  const pr = normalizeTaskIdentifier(exercise.identifikatorPr);

  if (sourceLabel?.trim()) {
    parts.push(sourceLabel.trim());
  }

  if (pp || pr) {
    parts.push(`PP: ${pp || "—"}`);
    parts.push(`PR: ${pr || "—"}`);
    return parts.length > 0 ? parts.join("   ") : null;
  }

  if (zrodlo === "pazdro" && exercise.number?.trim()) {
    const number = exercise.number.trim();
    parts.push(`PP: ${number}`);
    parts.push(`PR: ${number}`);
  }

  return parts.length > 0 ? parts.join("   ") : null;
}

export function formatExerciseIdentifierPreview(
  exercise: Pick<
    ParsedExercise,
    "number" | "identifikatorPp" | "identifikatorPr" | "identifikatorZrodla"
  >,
  zrodlo?: string | null
): string[] {
  if (zrodlo === "matura") {
    const identifier = formatCkeIdentifierPreviewLine(
      exercise.identifikatorZrodla
    );

    return identifier ? [identifier] : [];
  }

  const pp = normalizeTaskIdentifier(exercise.identifikatorPp);
  const pr = normalizeTaskIdentifier(exercise.identifikatorPr);

  if (pp || pr) {
    return formatPazdroIdentifierPreviewLines({
      identifikatorPp: pp || null,
      identifikatorPr: pr || null,
    });
  }

  if (zrodlo === "pazdro" && exercise.number?.trim()) {
    const number = exercise.number.trim();

    return formatPazdroIdentifierPreviewLines({
      identifikatorPp: number,
      identifikatorPr: number,
    });
  }

  return [];
}
