import {
  mergeSourceMetadata,
  normalizeSourceMetadata,
  sanitizeSourceMetadataForSource,
  sourceMetadataDiffers,
} from "@/app/lib/sourceMetadata";
import type {
  ImportExerciseMetadataOverrides,
  ImportSessionMetadata,
  ParsedExercise,
} from "./types";

export type { ImportExerciseMetadataOverrides };

const OVERRIDE_KEYS: Array<
  Exclude<keyof ImportSessionMetadata, "sourceMetadata">
> = [
  "klasaId",
  "dzialId",
  "tematId",
  "typ",
  "zrodlo",
  "identyfikatorPrefix",
];

export function resolveExerciseImportMetadata(
  sessionMetadata: ImportSessionMetadata,
  overrides?: ImportExerciseMetadataOverrides | null
): ImportSessionMetadata {
  const base = {
    klasaId: sessionMetadata.klasaId,
    dzialId: sessionMetadata.dzialId,
    tematId: sessionMetadata.tematId,
    typ: sessionMetadata.typ,
    zrodlo:
      overrides?.zrodlo !== undefined
        ? overrides.zrodlo
        : sessionMetadata.zrodlo,
    identyfikatorPrefix:
      overrides?.identyfikatorPrefix !== undefined
        ? overrides.identyfikatorPrefix
        : sessionMetadata.identyfikatorPrefix,
    sourceMetadata: mergeSourceMetadata(
      sessionMetadata.sourceMetadata,
      overrides?.sourceMetadata
    ),
  };

  return {
    ...base,
    sourceMetadata: sanitizeSourceMetadataForSource(
      base.zrodlo,
      base.sourceMetadata
    ),
  };
}

export function hasExerciseMetadataOverrides(
  overrides?: ImportExerciseMetadataOverrides | null
): boolean {
  return overrides != null && Object.keys(overrides).length > 0;
}

export function mergeExerciseMetadataOverrides(
  sessionMetadata: ImportSessionMetadata,
  current: ImportExerciseMetadataOverrides | null | undefined,
  patch: Partial<ImportSessionMetadata> & {
    sourceMetadata?: Partial<ImportSessionMetadata["sourceMetadata"]>;
  }
): ImportExerciseMetadataOverrides | null {
  const nextEffective = resolveExerciseImportMetadata(sessionMetadata, {
    ...current,
    ...patch,
    sourceMetadata: patch.sourceMetadata
      ? mergeSourceMetadata(
          resolveExerciseImportMetadata(sessionMetadata, current)
            .sourceMetadata,
          patch.sourceMetadata
        )
      : current?.sourceMetadata,
  });
  const overrides: ImportExerciseMetadataOverrides = {};

  for (const key of OVERRIDE_KEYS) {
    const nextValue = nextEffective[key];
    const sessionValue = sessionMetadata[key];

    if (nextValue !== sessionValue) {
      overrides[key] = nextValue as never;
    }
  }

  if (
    sourceMetadataDiffers(
      nextEffective.sourceMetadata,
      sessionMetadata.sourceMetadata
    )
  ) {
    overrides.sourceMetadata = nextEffective.sourceMetadata;
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

export function resolveExerciseScope(
  sessionMetadata: ImportSessionMetadata,
  exercise: Pick<ParsedExercise, "metadataOverrides" | "suggestedTyp">
): ImportSessionMetadata {
  const resolved = resolveExerciseImportMetadata(
    sessionMetadata,
    exercise.metadataOverrides
  );

  if (!resolved.typ && exercise.suggestedTyp) {
    return {
      ...resolved,
      typ: exercise.suggestedTyp,
    };
  }

  return resolved;
}

export function exerciseScopeIsComplete(
  metadata: ImportSessionMetadata
): boolean {
  return Boolean(metadata.klasaId && metadata.dzialId && metadata.tematId);
}

export function normalizeImportSessionMetadata(
  metadata: Partial<ImportSessionMetadata> & Record<string, unknown>
): ImportSessionMetadata {
  const zrodlo =
    metadata.zrodlo === undefined ? null : (metadata.zrodlo as string | null);

  const sourceMetadata = sanitizeSourceMetadataForSource(
    zrodlo,
    normalizeSourceMetadata(metadata.sourceMetadata)
  );

  return {
    klasaId: metadata.klasaId ?? "",
    dzialId: metadata.dzialId ?? "",
    tematId: metadata.tematId ?? "",
    typ: metadata.typ ?? "",
    zrodlo,
    identyfikatorPrefix: metadata.identyfikatorPrefix ?? null,
    sourceMetadata,
  };
}
