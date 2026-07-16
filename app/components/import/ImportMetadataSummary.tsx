import type { ImportSessionMetadata } from "@/app/lib/import/types";

type Props = {
  metadata: ImportSessionMetadata;
  sessionId: string;
};

export default function ImportMetadataSummary({
  metadata,
  sessionId,
}: Props) {
  const complete =
    metadata.klasaId && metadata.dzialId && metadata.tematId;

  return (
    <div
      className={[
        "import-metadata-summary",
        complete ? "" : "import-metadata-summary--incomplete",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p>
        {complete
          ? "Metadane importu są ustawione (klasa, dział, temat)."
          : "Uzupełnij metadane w podglądzie importu przed zapisem do bazy."}
      </p>
      <a
        href={`/nauczyciel/import/${sessionId}`}
        className="import-link"
      >
        Wróć do podglądu metadanych
      </a>
    </div>
  );
}
