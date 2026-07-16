"use client";

import { useEffect, useId, useState } from "react";

import {
  DOCUMENT_CLASS_OPTIONS,
  DOCUMENT_LEVEL_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  defaultDocumentClass,
  defaultDocumentLevel,
  defaultDocumentType,
  type DocumentClass,
  type DocumentLevel,
  type DocumentType,
} from "@/app/lib/documentMetadata";

import "./save-document-dialog.css";

export type SaveDocumentFormValues = {
  tytul: string;
  typ: DocumentType;
  klasa: DocumentClass;
  poziom: DocumentLevel;
  opis: string;
};

type Props = {
  open: boolean;
  initialTitle?: string;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (values: SaveDocumentFormValues) => void;
};

export default function SaveDocumentDialog({
  open,
  initialTitle = "",
  saving = false,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const [tytul, setTytul] = useState(initialTitle);
  const [typ, setTyp] = useState<DocumentType>(defaultDocumentType());
  const [klasa, setKlasa] = useState<DocumentClass>(defaultDocumentClass());
  const [poziom, setPoziom] = useState<DocumentLevel>(defaultDocumentLevel());
  const [opis, setOpis] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTytul(initialTitle);
    setTyp(defaultDocumentType());
    setKlasa(defaultDocumentClass());
    setPoziom(defaultDocumentLevel());
    setOpis("");
    setError(null);
  }, [open, initialTitle]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onCancel]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!tytul.trim()) {
      setError("Tytuł jest wymagany.");
      return;
    }

    setError(null);
    onConfirm({
      tytul: tytul.trim(),
      typ,
      klasa,
      poziom,
      opis: opis.trim(),
    });
  }

  return (
    <div
      className="save-document-dialog__backdrop"
      role="presentation"
      onClick={saving ? undefined : onCancel}
    >
      <div
        className="save-document-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="save-document-dialog__header">
          <h2 id={titleId}>Zapisz dokument</h2>
          <p>Uzupełnij metadane przed pierwszym zapisem projektu.</p>
        </header>

        <form className="save-document-dialog__form" onSubmit={handleSubmit}>
          <label className="save-document-dialog__field">
            <span>
              Tytuł <span className="save-document-dialog__required">*</span>
            </span>
            <input
              type="text"
              value={tytul}
              onChange={(event) => setTytul(event.target.value)}
              placeholder="Np. Sprawdzian — Zbiory"
              autoFocus
              disabled={saving}
            />
          </label>

          <label className="save-document-dialog__field">
            <span>
              Typ dokumentu{" "}
              <span className="save-document-dialog__required">*</span>
            </span>
            <select
              value={typ}
              onChange={(event) =>
                setTyp(event.target.value as DocumentType)
              }
              disabled={saving}
            >
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="save-document-dialog__field">
            <span>
              Klasa <span className="save-document-dialog__required">*</span>
            </span>
            <select
              value={klasa}
              onChange={(event) =>
                setKlasa(event.target.value as DocumentClass)
              }
              disabled={saving}
            >
              {DOCUMENT_CLASS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="save-document-dialog__field">
            <span>
              Poziom <span className="save-document-dialog__required">*</span>
            </span>
            <select
              value={poziom}
              onChange={(event) =>
                setPoziom(event.target.value as DocumentLevel)
              }
              disabled={saving}
            >
              {DOCUMENT_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="save-document-dialog__field">
            <span>Opis</span>
            <textarea
              value={opis}
              onChange={(event) => setOpis(event.target.value)}
              placeholder="Opcjonalny opis dla Ciebie…"
              rows={3}
              disabled={saving}
            />
          </label>

          {error ? (
            <p className="save-document-dialog__error" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="save-document-dialog__footer">
            <button
              type="button"
              className="save-document-dialog__button save-document-dialog__button--secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="save-document-dialog__button save-document-dialog__button--primary"
              disabled={saving}
            >
              {saving ? "Zapisywanie…" : "Zapisz dokument"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
