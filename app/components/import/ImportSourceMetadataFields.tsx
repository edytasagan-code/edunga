"use client";

import {
  getSourceMetadataFields,
  sourceMetadataHasFields,
  type SourceMetadata,
} from "@/app/lib/sourceMetadata";

type Props = {
  zrodlo: string | null;
  value: SourceMetadata;
  disabled?: boolean;
  onChange: (patch: Partial<SourceMetadata>) => void;
};

export default function ImportSourceMetadataFields({
  zrodlo,
  value,
  disabled = false,
  onChange,
}: Props) {
  const fields = getSourceMetadataFields(zrodlo);

  if (!sourceMetadataHasFields(zrodlo) || fields.length === 0) {
    return null;
  }

  return (
    <div className="import-source-metadata-fields">
      {fields.map((field) => {
        if (field.kind === "number") {
          return (
            <label key={field.key} className="import-source-metadata-fields__field">
              <span className="import-label">{field.label}</span>
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={value[field.key] ?? ""}
                disabled={disabled}
                placeholder={field.placeholder}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  onChange({
                    [field.key]: next === "" ? null : Number(next),
                  });
                }}
                className="import-metadata__input import-metadata__input--compact"
              />
            </label>
          );
        }

        return (
          <label key={field.key} className="import-source-metadata-fields__field">
            <span className="import-label">{field.label}</span>
            <select
              value={value[field.key] ?? ""}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  [field.key]: event.target.value || null,
                })
              }
              className="import-metadata__input import-metadata__input--compact"
            >
              <option value="">—</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
