"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DOCUMENT_CLASS_OPTIONS,
  DOCUMENT_LEVEL_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  type DocumentClass,
  type DocumentLevel,
  type DocumentType,
} from "@/app/lib/documentMetadata";
import type { DocumentLibrarySummary } from "@/app/lib/documentProject";

import "./document-library.css";

type ArchiveFilter = "active" | "archived" | "all";

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function matchesTitleFilter(document: DocumentLibrarySummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return document.tytul.toLowerCase().includes(normalized);
}

export default function DocumentLibraryTable() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentLibrarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [titleQuery, setTitleQuery] = useState("");
  const [classFilter, setClassFilter] = useState<DocumentClass | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [levelFilter, setLevelFilter] = useState<DocumentLevel | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const archivedParam =
    archiveFilter === "archived"
      ? "true"
      : archiveFilter === "all"
        ? "all"
        : "false";

  const hasActiveFilters =
    titleQuery.trim().length > 0 ||
    classFilter !== "all" ||
    typeFilter !== "all" ||
    levelFilter !== "all";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dokumenty?archived=${archivedParam}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Nie udało się wczytać dokumentów.");
      }

      const data = (await response.json()) as DocumentLibrarySummary[];
      setDocuments(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nie udało się wczytać dokumentów."
      );
    } finally {
      setLoading(false);
    }
  }, [archivedParam]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (!matchesTitleFilter(document, titleQuery)) {
        return false;
      }

      if (classFilter !== "all" && document.klasa !== classFilter) {
        return false;
      }

      if (typeFilter !== "all" && document.typ !== typeFilter) {
        return false;
      }

      if (levelFilter !== "all" && document.poziom !== levelFilter) {
        return false;
      }

      return true;
    });
  }, [documents, titleQuery, classFilter, typeFilter, levelFilter]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function clearFilters() {
    setTitleQuery("");
    setClassFilter("all");
    setTypeFilter("all");
    setLevelFilter("all");
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);

    try {
      const response = await fetch(`/api/dokumenty/${id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        alert(payload?.error ?? "Nie udało się zduplikować dokumentu.");
        return;
      }

      const record = await response.json();
      router.push(`/nauczyciel/generator/${record.id}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(id: string, archive: boolean) {
    setBusyId(id);

    try {
      const response = await fetch(`/api/dokumenty/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zarchiwizowany: archive }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        alert(payload?.error ?? "Nie udało się zaktualizować dokumentu.");
        return;
      }

      await loadDocuments();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (
      !window.confirm(
        `Usunąć dokument „${title}”? Tej operacji nie można cofnąć.`
      )
    ) {
      return;
    }

    setBusyId(id);

    try {
      const response = await fetch(`/api/dokumenty/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        alert(payload?.error ?? "Nie udało się usunąć dokumentu.");
        return;
      }

      await loadDocuments();
    } finally {
      setBusyId(null);
    }
  }

  function startRename(document: DocumentLibrarySummary) {
    setRenamingId(document.id);
    setRenameValue(document.tytul);
  }

  async function submitRename(id: string) {
    const trimmed = renameValue.trim();

    if (!trimmed) {
      alert("Tytuł nie może być pusty.");
      return;
    }

    setBusyId(id);

    try {
      const response = await fetch(`/api/dokumenty/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tytul: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        alert(payload?.error ?? "Nie udało się zmienić tytułu.");
        return;
      }

      setRenamingId(null);
      await loadDocuments();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="document-library">
      <header className="document-library__header">
        <div>
          <h1>Biblioteka dokumentów</h1>
          <p>
            Główne miejsce do otwierania, edycji i zarządzania zapisanymi
            projektami. PDF generowany zawsze na żądanie.
          </p>
        </div>

        <div className="document-library__header-actions">
          <Link href="/nauczyciel/generator" className="document-library__cta">
            + Nowy dokument
          </Link>
        </div>
      </header>

      <div className="document-library__toolbar">
        <div className="document-library__filters" role="tablist">
          {(
            [
              ["active", "Aktywne"],
              ["archived", "Archiwum"],
              ["all", "Wszystkie"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={archiveFilter === value}
              className={
                archiveFilter === value
                  ? "document-library__filter document-library__filter--active"
                  : "document-library__filter"
              }
              onClick={() => setArchiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="document-library__search-panel">
        <label className="document-library__search-field document-library__search-field--grow">
          <span>Tytuł</span>
          <input
            type="search"
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
            placeholder="Szukaj po tytule…"
          />
        </label>

        <label className="document-library__search-field">
          <span>Klasa</span>
          <select
            value={classFilter}
            onChange={(event) =>
              setClassFilter(event.target.value as DocumentClass | "all")
            }
          >
            <option value="all">Wszystkie</option>
            {DOCUMENT_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="document-library__search-field">
          <span>Typ</span>
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as DocumentType | "all")
            }
          >
            <option value="all">Wszystkie</option>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="document-library__search-field">
          <span>Poziom</span>
          <select
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(event.target.value as DocumentLevel | "all")
            }
          >
            <option value="all">Wszystkie</option>
            {DOCUMENT_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters ? (
          <button
            type="button"
            className="document-library__clear-filters"
            onClick={clearFilters}
          >
            Wyczyść filtry
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="document-library__state">Ładowanie dokumentów…</div>
      ) : error ? (
        <div className="document-library__state document-library__state--error">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="document-library__state">
          Brak dokumentów w tej kategorii.{" "}
          <Link href="/nauczyciel/generator">Utwórz pierwszy dokument</Link>.
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="document-library__state">
          Brak dokumentów pasujących do filtrów.{" "}
          <button
            type="button"
            className="document-library__inline-action"
            onClick={clearFilters}
          >
            Wyczyść filtry
          </button>
        </div>
      ) : (
        <div className="document-library__table-wrap">
          <p className="document-library__result-count">
            {filteredDocuments.length}{" "}
            {filteredDocuments.length === 1 ? "dokument" : "dokumentów"}
          </p>
          <table className="document-library__table">
            <thead>
              <tr>
                <th>Klasa</th>
                <th>Data</th>
                <th>Tytuł</th>
                <th>Typ</th>
                <th>Poziom</th>
                <th>Czas</th>
                <th>Punkty</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => {
                const isBusy = busyId === document.id;

                return (
                  <tr
                    key={document.id}
                    className={
                      document.zarchiwizowany
                        ? "document-library__row document-library__row--archived"
                        : "document-library__row"
                    }
                  >
                    <td className="document-library__class-cell">
                      {document.klasaLabel}
                    </td>
                    <td className="document-library__date-cell">
                      {formatUpdatedAt(document.updatedAt)}
                    </td>
                    <td>
                      {renamingId === document.id ? (
                        <form
                          className="document-library__rename-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void submitRename(document.id);
                          }}
                        >
                          <input
                            value={renameValue}
                            onChange={(event) =>
                              setRenameValue(event.target.value)
                            }
                            autoFocus
                            disabled={isBusy}
                          />
                          <button type="submit" disabled={isBusy}>
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            disabled={isBusy}
                          >
                            Anuluj
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/nauczyciel/generator/${document.id}`}
                          className="document-library__title-link"
                        >
                          {document.tytul}
                        </Link>
                      )}
                    </td>
                    <td>{document.typLabel}</td>
                    <td>{document.poziomLabel}</td>
                    <td>{document.estimatedMinutes} min</td>
                    <td>{document.totalPoints}</td>
                    <td>
                      <div className="document-library__actions">
                        <Link
                          href={`/nauczyciel/generator/${document.id}`}
                          className="document-library__action"
                        >
                          Otwórz
                        </Link>
                        <button
                          type="button"
                          className="document-library__action"
                          disabled={isBusy}
                          onClick={() => startRename(document)}
                        >
                          Zmień nazwę
                        </button>
                        <button
                          type="button"
                          className="document-library__action"
                          disabled={isBusy}
                          onClick={() => void handleDuplicate(document.id)}
                        >
                          Duplikuj
                        </button>
                        <button
                          type="button"
                          className="document-library__action"
                          disabled={isBusy}
                          onClick={() =>
                            void handleArchive(
                              document.id,
                              !document.zarchiwizowany
                            )
                          }
                        >
                          {document.zarchiwizowany ? "Przywróć" : "Archiwizuj"}
                        </button>
                        <button
                          type="button"
                          className="document-library__action document-library__action--danger"
                          disabled={isBusy}
                          onClick={() =>
                            void handleDelete(document.id, document.tytul)
                          }
                        >
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
