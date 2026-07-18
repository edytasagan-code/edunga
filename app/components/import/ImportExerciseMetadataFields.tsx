type ExerciseMetadata = {
  poziom: number | null;
  punkty: number | null;
  czas: number | null;
};

type Props = {
  value: ExerciseMetadata;
  disabled?: boolean;
  compact?: boolean;
  onChange: (patch: Partial<ExerciseMetadata>) => void;
};

export default function ImportExerciseMetadataFields({
  value,
  disabled = false,
  compact = false,
  onChange,
}: Props) {
  const className = compact
    ? "import-exercise-metadata import-exercise-metadata--compact"
    : "import-exercise-metadata";

  return (
    <div className={className}>
      {!compact && (
        <h3 className="import-exercise-metadata__title">
          Metadane zadania
        </h3>
      )}

      <div className="import-exercise-metadata__grid">
        <label className="import-exercise-metadata__field">
          <span>Trudność</span>
          <select
            value={value.poziom ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;

              onChange({
                poziom: next === "" ? null : Number(next),
              });
            }}
            className="import-metadata__input"
          >
            <option value="">—</option>
            <option value="1">★☆☆☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="3">★★★☆☆</option>
            <option value="4">★★★★☆</option>
            <option value="5">★★★★★</option>
          </select>
        </label>

        <label className="import-exercise-metadata__field">
          <span>Punkty</span>
          <input
            type="number"
            min={0}
            value={value.punkty ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value.trim();

              onChange({
                punkty: next === "" ? null : Number(next) || 0,
              });
            }}
            placeholder="—"
            className="import-metadata__input"
          />
        </label>

        <label className="import-exercise-metadata__field">
          <span>Czas (min)</span>
          <input
            type="number"
            min={0}
            value={value.czas ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value.trim();

              onChange({
                czas: next === "" ? null : Number(next) || 0,
              });
            }}
            placeholder="—"
            className="import-metadata__input"
          />
        </label>
      </div>
    </div>
  );
}
