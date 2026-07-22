"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ImportStepIndicator from "./ImportStepIndicator";

type Props = {
  onProcessingChange?: (processing: boolean) => void;
};

export default function ImportUpload({ onProcessingChange }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setError(null);
    setProcessingFileName(file.name);
    setProcessing(true);
    onProcessingChange?.(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/process", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Import nie powiódł się.");
      }

      router.push(`/nauczyciel/import/${payload.sessionId}`);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import nie powiódł się."
      );
    } finally {
      setProcessing(false);
      setProcessingFileName(null);
      onProcessingChange?.(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Dozwolone są wyłącznie pliki PDF.");
      return;
    }

    void processFile(file);
  }

  return (
    <section className="import-upload">
      <ImportStepIndicator current="upload" />

      <div className="import-upload__intro">
        <h1 className="import-upload__title">Import zadań z PDF</h1>
        <p className="import-upload__text">
          Prześlij plik PDF. System wykona OCR, wykryje zadania i przygotuje
          podgląd do ręcznej korekty. Nic nie trafi do bazy bez Twojego
          potwierdzenia.
        </p>
      </div>

      <div
        className={[
          "import-upload__dropzone",
          dragOver ? "import-upload__dropzone--active" : "",
          processing ? "import-upload__dropzone--processing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="import-upload__input"
          disabled={processing}
          onChange={(event) => handleFiles(event.target.files)}
        />

        {processing ? (
          <div className="import-upload__progress">
            <div className="import-upload__spinner" aria-hidden="true" />
            <div>
              <p className="import-upload__progress-title">
                Przetwarzanie PDF…
              </p>
              <p className="import-upload__progress-meta">
                {processingFileName
                  ? `Plik: ${processingFileName}`
                  : "Przygotowywanie importu"}
              </p>
              <p className="import-upload__progress-meta">
                Vision AI → wykrywanie zadań → podgląd. Arkusze CKE i skany
                mogą potrwać 1–5 minut — poczekaj na wynik końcowy.
              </p>
            </div>
          </div>
        ) : (
          <p className="import-upload__dropzone-title">
            Upuść plik PDF lub wybierz z dysku
          </p>
        )}

        <button
          type="button"
          className="import-upload__button"
          disabled={processing}
          onClick={() => inputRef.current?.click()}
        >
          Wybierz PDF
        </button>
      </div>

      {error && (
        <pre className="import-upload__error import-upload__error--details">
          {error}
        </pre>
      )}

      <ul className="import-upload__pipeline">
        <li>PDF — przesłanie pliku</li>
        <li>OCR — ekstrakcja tekstu</li>
        <li>Rekonstrukcja matematyki — LaTeX i struktura wyrażeń</li>
        <li>Parser — wykrycie zadań</li>
        <li>Podgląd — weryfikacja listy zadań</li>
        <li>Edytor — korekta przed zapisem</li>
        <li>Baza — zapis dopiero po potwierdzeniu</li>
      </ul>
    </section>
  );
}
