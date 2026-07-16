"use client";

import { useEffect, useRef, useState } from "react";

import type { EditorDocument } from "./types";

type Props = {
  document: EditorDocument;
  debounceMs?: number;
};

export default function EditorPdfPreview({
  document,
  debounceMs = 600,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const revokeRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setStatus("loading");

        try {
          const response = await fetch("/api/editor/preview-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ document }),
          });

          if (!response.ok) {
            throw new Error("Preview failed");
          }

          const blob = await response.blob();

          if (cancelled) {
            return;
          }

          const nextUrl = URL.createObjectURL(blob);

          if (revokeRef.current) {
            URL.revokeObjectURL(revokeRef.current);
          }

          revokeRef.current = nextUrl;
          setPdfUrl(nextUrl);
          setStatus("idle");
        } catch {
          if (!cancelled) {
            setStatus("error");
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [document, debounceMs]);

  useEffect(() => {
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
      }
    };
  }, []);

  return (
    <div className="edunga-editor-pdf-preview">
      <div className="edunga-editor-pdf-preview__header">
        <span>Podgląd PDF</span>
        <span className="edunga-editor-pdf-preview__status">
          {status === "loading"
            ? "Aktualizowanie…"
            : status === "error"
              ? "Błąd podglądu"
              : "Na żywo"}
        </span>
      </div>

      {status === "error" ? (
        <div className="edunga-editor-pdf-preview__error">
          Nie udało się wygenerować podglądu PDF.
        </div>
      ) : pdfUrl ? (
        <div className="edunga-editor-pdf-preview__frame">
          <iframe title="Podgląd PDF zadania" src={pdfUrl} />
        </div>
      ) : (
        <div className="edunga-editor-pdf-preview__empty">
          Przygotowywanie podglądu…
        </div>
      )}
    </div>
  );
}
