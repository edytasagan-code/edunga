"use client";

import { useCurriculum } from "@/app/lib/curriculum/useCurriculum";
import {
  hasExerciseMetadataOverrides,
  mergeExerciseMetadataOverrides,
  resolveExerciseImportMetadata,
} from "@/app/lib/import/exerciseMetadata";
import type { ImportSessionMetadata, ParsedExercise } from "@/app/lib/import/types";
import { TASK_SOURCE_OPTIONS } from "@/app/lib/taskSource";
import type { SourceMetadata } from "@/app/lib/sourceMetadata";

import { IMPORT_TASK_TYPE_OPTIONS } from "./ImportMetadataForm";
import ImportSourceMetadataFields from "./ImportSourceMetadataFields";

type Props = {
  sessionMetadata: ImportSessionMetadata;
  exercise: Pick<
    ParsedExercise,
    "poziom" | "punkty" | "czas" | "metadataOverrides"
  >;
  disabled?: boolean;
  onChange: (patch: {
    metadataOverrides?: ParsedExercise["metadataOverrides"];
    poziom?: ParsedExercise["poziom"];
    punkty?: ParsedExercise["punkty"];
    czas?: ParsedExercise["czas"];
  }) => void;
};

export default function ImportExerciseMetadataPanel({
  sessionMetadata,
  exercise,
  disabled = false,
  onChange,
}: Props) {
  const effectiveMetadata = resolveExerciseImportMetadata(
    sessionMetadata,
    exercise.metadataOverrides
  );
  const customized = hasExerciseMetadataOverrides(exercise.metadataOverrides);

  const {
    klasy,
    dzialy,
    tematy,
    loadingKlasy,
    loadingDzialy,
    loadingTematy,
    setKlasaId,
    setDzialId,
    setTematId,
  } = useCurriculum({
    initialKlasaId: effectiveMetadata.klasaId,
    initialDzialId: effectiveMetadata.dzialId,
    initialTematId: effectiveMetadata.tematId,
  });

  const dzialyKlasy = dzialy.filter(
    (item) => item.klasaId === effectiveMetadata.klasaId
  );
  const tematyDzialu = tematy.filter(
    (item) => item.dzialId === effectiveMetadata.dzialId
  );

  function patchScope(partial: Partial<ImportSessionMetadata>) {
    onChange({
      metadataOverrides: mergeExerciseMetadataOverrides(
        sessionMetadata,
        exercise.metadataOverrides,
        partial
      ),
    });
  }

  function patchSourceMetadata(partial: Partial<SourceMetadata>) {
    onChange({
      metadataOverrides: mergeExerciseMetadataOverrides(
        sessionMetadata,
        exercise.metadataOverrides,
        {
          sourceMetadata: {
            ...effectiveMetadata.sourceMetadata,
            ...partial,
          },
        }
      ),
    });
  }

  return (
    <div className="import-exercise-metadata-panel">
      {customized && (
        <p className="import-exercise-metadata-panel__note">
          Metadane dostosowane dla tego zadania
        </p>
      )}

      <div className="import-exercise-metadata-panel__grid import-exercise-metadata-panel__grid--row1">
        <select
          value={effectiveMetadata.klasaId}
          disabled={disabled || loadingKlasy}
          onChange={(event) => {
            setKlasaId(event.target.value);
            patchScope({
              klasaId: event.target.value,
              dzialId: "",
              tematId: "",
            });
          }}
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Klasa</option>
          {klasy.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nazwa}
            </option>
          ))}
        </select>

        <select
          value={effectiveMetadata.dzialId}
          disabled={disabled || !effectiveMetadata.klasaId || loadingDzialy}
          onChange={(event) => {
            setDzialId(event.target.value);
            patchScope({ dzialId: event.target.value, tematId: "" });
          }}
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Dział</option>
          {dzialyKlasy.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nazwa}
            </option>
          ))}
        </select>

        <select
          value={effectiveMetadata.tematId}
          disabled={disabled || !effectiveMetadata.dzialId || loadingTematy}
          onChange={(event) => {
            setTematId(event.target.value);
            patchScope({ tematId: event.target.value });
          }}
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Temat</option>
          {tematyDzialu.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nazwa}
            </option>
          ))}
        </select>
      </div>

      <div className="import-exercise-metadata-panel__grid import-exercise-metadata-panel__grid--row2">
        <select
          value={effectiveMetadata.typ}
          disabled={disabled}
          onChange={(event) => patchScope({ typ: event.target.value })}
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Typ zadania</option>
          {IMPORT_TASK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={effectiveMetadata.zrodlo ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patchScope({ zrodlo: event.target.value || null })
          }
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Źródło</option>
          {TASK_SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={exercise.poziom ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            onChange({
              poziom: next === "" ? null : Number(next),
            });
          }}
          className="import-metadata__input import-metadata__input--compact"
        >
          <option value="">Trudność</option>
          <option value="1">★☆☆☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="3">★★★☆☆</option>
          <option value="4">★★★★☆</option>
          <option value="5">★★★★★</option>
        </select>

        <input
          type="number"
          min={0}
          value={exercise.punkty ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value.trim();
            onChange({
              punkty: next === "" ? null : Number(next) || 0,
            });
          }}
          placeholder="Punkty"
          className="import-metadata__input import-metadata__input--compact"
        />

        <input
          type="number"
          min={0}
          value={exercise.czas ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value.trim();
            onChange({
              czas: next === "" ? null : Number(next) || 0,
            });
          }}
          placeholder="Czas (min)"
          className="import-metadata__input import-metadata__input--compact"
        />
      </div>

      <ImportSourceMetadataFields
        zrodlo={effectiveMetadata.zrodlo}
        value={effectiveMetadata.sourceMetadata}
        disabled={disabled}
        onChange={patchSourceMetadata}
      />
    </div>
  );
}
