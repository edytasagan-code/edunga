"use client";

import { useCurriculum } from "@/app/lib/curriculum/useCurriculum";
import {
  sanitizeSourceMetadataForSource,
  type SourceMetadata,
} from "@/app/lib/sourceMetadata";
import { TASK_SOURCE_OPTIONS } from "@/app/lib/taskSource";
import type { ImportSessionMetadata } from "@/app/lib/import/types";

import ImportSourceMetadataFields from "./ImportSourceMetadataFields";

type Props = {
  value: ImportSessionMetadata;
  onChange: (metadata: ImportSessionMetadata) => void;
  disabled?: boolean;
  title?: string;
};

export const IMPORT_TASK_TYPE_OPTIONS = [
  { value: "otwarte", label: "Otwarte" },
  { value: "wybor-wielokrotny", label: "Wielokrotny wybór (A–D)" },
  { value: "zamkniete", label: "Zamknięte" },
  { value: "prawda-falsz", label: "Prawda / fałsz" },
  { value: "uzupelnij", label: "Uzupełnij" },
  { value: "dobierz", label: "Dobierz" },
  { value: "test", label: "Test" },
] as const;

export default function ImportMetadataForm({
  value,
  onChange,
  disabled = false,
  title = "Metadane wspólne importu",
}: Props) {
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
    initialKlasaId: value.klasaId,
    initialDzialId: value.dzialId,
    initialTematId: value.tematId,
  });

  const dzialyKlasy = dzialy.filter(
    (item) => item.klasaId === value.klasaId
  );
  const tematyDzialu = tematy.filter(
    (item) => item.dzialId === value.dzialId
  );

  function patch(partial: Partial<ImportSessionMetadata>) {
    const next = { ...value, ...partial };

    if (partial.zrodlo !== undefined) {
      next.sourceMetadata = sanitizeSourceMetadataForSource(
        partial.zrodlo,
        next.sourceMetadata
      );
    }

    onChange(next);
  }

  function patchSourceMetadata(partial: Partial<SourceMetadata>) {
    onChange({
      ...value,
      sourceMetadata: {
        ...value.sourceMetadata,
        ...partial,
      },
    });
  }

  return (
    <div className="import-metadata import-metadata--compact">
      <h2 className="import-metadata__title">{title}</h2>

      <div className="import-metadata__grid import-metadata__grid--3">
        <select
          value={value.klasaId}
          disabled={disabled || loadingKlasy}
          onChange={(event) => {
            setKlasaId(event.target.value);
            patch({ klasaId: event.target.value, dzialId: "", tematId: "" });
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
          value={value.dzialId}
          disabled={disabled || !value.klasaId || loadingDzialy}
          onChange={(event) => {
            setDzialId(event.target.value);
            patch({ dzialId: event.target.value, tematId: "" });
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
          value={value.tematId}
          disabled={disabled || !value.dzialId || loadingTematy}
          onChange={(event) => {
            setTematId(event.target.value);
            patch({ tematId: event.target.value });
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

      <div className="import-metadata__grid import-metadata__grid--3">
        <select
          value={value.typ}
          disabled={disabled}
          onChange={(event) => patch({ typ: event.target.value })}
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
          value={value.zrodlo ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patch({ zrodlo: event.target.value || null })
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

        <input
          type="text"
          value={value.identyfikatorPrefix ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patch({
              identyfikatorPrefix: event.target.value.trim() || null,
            })
          }
          placeholder="Prefiks identyfikatora (np. PAZDRO)"
          className="import-metadata__input import-metadata__input--compact"
        />
      </div>

      <ImportSourceMetadataFields
        zrodlo={value.zrodlo}
        value={value.sourceMetadata}
        disabled={disabled}
        onChange={patchSourceMetadata}
      />
    </div>
  );
}
