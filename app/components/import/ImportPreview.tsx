"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import DocumentViewer, {
  hasAnswerContent,
  hasDocumentContent,
} from "@/app/components/document-viewer";
import type {
  DuplicateDecision,
  ExerciseDuplicateResult,
} from "@/app/lib/import/duplicateCheck";
import type { ImportSession } from "@/app/lib/import/types";
import {
  exerciseScopeIsComplete,
  resolveExerciseScope,
} from "@/app/lib/import/exerciseMetadata";
import { formatExerciseMetadataLine, formatExerciseCardTitle } from "@/app/lib/import/saveExercise";
import { taskSourceLabel } from "@/app/lib/taskSource";

import ImportExerciseMetadataPanel from "./ImportExerciseMetadataPanel";
import ImportMetadataForm from "./ImportMetadataForm";
import ImportStepIndicator from "./ImportStepIndicator";

type Props = {
  sessionId: string;
};

function duplicateLabel(status: ExerciseDuplicateResult["status"]): string {
  switch (status) {
    case "new":
      return "✓ Nowe zadanie";
    case "content":
      return "⚠ Możliwy duplikat";
    case "exact":
      return "✖ Już istnieje";
  }
}

function defaultDuplicateDecision(
  status: ExerciseDuplicateResult["status"]
): DuplicateDecision {
  return status === "exact" ? "skip" : "save";
}

function formatDuplicateIdentifiers(
  duplicate: ExerciseDuplicateResult
): string {
  return (
    formatExerciseMetadataLine({
      number: duplicate.identyfikator,
      identifikatorPp: duplicate.identifikatorPp,
      identifikatorPr: duplicate.identifikatorPr,
    }) ?? duplicate.identyfikator ?? "—"
  );
}

function formatExistingTaskIdentifiers(
  existing: ExerciseDuplicateResult["existing"]
): string {
  if (!existing) {
    return "—";
  }

  return (
    formatExerciseMetadataLine({
      number: existing.identyfikator,
      identifikatorPp: existing.identifikatorPp,
      identifikatorPr: existing.identifikatorPr,
    }) ?? existing.identyfikator ?? "—"
  );
}

export default function ImportPreview({ sessionId }: Props) {
  const searchParams = useSearchParams();
  const savedKod = searchParams.get("zapisane");
  const [session, setSession] = useState<ImportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [duplicates, setDuplicates] = useState<
    Map<number, ExerciseDuplicateResult>
  >(new Map());
  const [duplicateDecisions, setDuplicateDecisions] = useState<
    Map<number, DuplicateDecision>
  >(new Map());

  const loadDuplicates = useCallback(async () => {
    const response = await fetch(`/api/import/${sessionId}/duplicates`);

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      duplicates: ExerciseDuplicateResult[];
    };

    const next = new Map<number, ExerciseDuplicateResult>();

    for (const item of payload.duplicates) {
      next.set(item.index, item);
    }

    setDuplicates(next);
    setDuplicateDecisions((current) => {
      const merged = new Map(current);

      for (const item of payload.duplicates) {
        if (!merged.has(item.index)) {
          merged.set(item.index, defaultDuplicateDecision(item.status));
        }
      }

      return merged;
    });
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/import/${sessionId}`);

        if (!response.ok) {
          throw new Error("Sesja importu wygasła lub nie istnieje.");
        }

        const payload = (await response.json()) as ImportSession;

        if (!cancelled) {
          setSession(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać podglądu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDuplicates();
  }, [session, loadDuplicates]);

  async function persistMetadata(metadata: ImportSession["metadata"]) {
    if (!session) {
      return false;
    }

    setSavingMetadata(true);

    try {
      const response = await fetch(`/api/import/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zapisać metadanych.");
      }

      const payload = (await response.json()) as ImportSession;
      setSession(payload);
      await loadDuplicates();
      return true;
    } catch (metadataError) {
      alert(
        metadataError instanceof Error
          ? metadataError.message
          : "Nie udało się zapisać metadanych."
      );
      return false;
    } finally {
      setSavingMetadata(false);
    }
  }

  async function openExerciseEditor(index: number) {
    if (!session) {
      return;
    }

    const saved = await persistMetadata(session.metadata);

    if (!saved) {
      return;
    }

    window.location.href = `/nauczyciel/import/${sessionId}/zadanie/${index}`;
  }

  function setDuplicateDecision(index: number, decision: DuplicateDecision) {
    setDuplicateDecisions((current) => {
      const next = new Map(current);
      next.set(index, decision);
      return next;
    });
  }

  async function saveAllSelected() {
    if (!session) {
      return;
    }

    const saved = await persistMetadata(session.metadata);

    if (!saved) {
      return;
    }

    const incompleteMetadata = session.exercises.filter(
      (exercise) =>
        exercise.selected &&
        !exercise.saved &&
        !exerciseScopeIsComplete(
          resolveExerciseScope(session.metadata, exercise)
        )
    );

    if (incompleteMetadata.length > 0) {
      alert(
        `${incompleteMetadata.length} zaznaczone zadania mają niepełne metadane (klasa, dział, temat). Uzupełnij je w sekcji metadanych zadania.`
      );
      return;
    }

    const missingScope = session.exercises.some(
      (exercise) => exercise.selected && !exercise.saved && !exercise.level
    );

    if (missingScope) {
      const confirmed = window.confirm(
        "Niektóre zaznaczone zadania nie mają ustawionego zakresu (Podstawowy/Rozszerzony). Zapisać mimo to?"
      );

      if (!confirmed) {
        return;
      }
    }

    const duplicateSummary = session.exercises.filter(
      (exercise) =>
        exercise.selected &&
        !exercise.saved &&
        duplicates.get(exercise.index)?.status !== "new"
    );

    if (duplicateSummary.length > 0) {
      const confirmed = window.confirm(
        `${duplicateSummary.length} zaznaczone zadania mają status duplikatu. Kontynuować zapis zgodnie z wybranymi akcjami?`
      );

      if (!confirmed) {
        return;
      }
    }

    const confirmed = window.confirm(
      "Potwierdź zapis wszystkich zaznaczonych zadań do bazy."
    );

    if (!confirmed) {
      return;
    }

    setSavingAll(true);

    try {
      const decisions: Record<string, DuplicateDecision> = {};

      for (const exercise of session.exercises) {
        if (!exercise.selected || exercise.saved) {
          continue;
        }

        const duplicate = duplicates.get(exercise.index);

        decisions[String(exercise.index)] =
          duplicateDecisions.get(exercise.index) ??
          defaultDuplicateDecision(duplicate?.status ?? "new");
      }

      const response = await fetch(`/api/import/${sessionId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onlySelected: true,
          duplicateDecisions: decisions,
        }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zapisać zadań do bazy.");
      }

      const payload = (await response.json()) as {
        session: ImportSession;
        saved: Array<{ kod: string }>;
        skipped: Array<{ index: number; reason: string }>;
      };

      setSession(payload.session);
      await loadDuplicates();

      const savedCount = payload.saved.length;
      const skippedDuplicates = payload.skipped.filter((item) =>
        item.reason.startsWith("duplicate-")
      ).length;

      if (savedCount > 0 || skippedDuplicates > 0) {
        alert(
          [
            savedCount > 0 ? `Zapisano ${savedCount} zadań.` : null,
            skippedDuplicates > 0
              ? `Pominięto ${skippedDuplicates} duplikatów.`
              : null,
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
    } catch (saveError) {
      alert(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać zadań."
      );
    } finally {
      setSavingAll(false);
    }
  }

  async function patchExercise(
    index: number,
    patch: Partial<ImportSession["exercises"][number]>
  ) {
    const response = await fetch(
      `/api/import/${sessionId}/exercises/${index}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ImportSession;
    setSession(payload);
    return payload;
  }

  async function toggleSelected(index: number, selected: boolean) {
    await patchExercise(index, { selected });
  }

  async function updateExerciseMetadata(
    index: number,
    patch: {
      metadataOverrides?: ImportSession["exercises"][number]["metadataOverrides"];
      poziom?: ImportSession["exercises"][number]["poziom"];
      punkty?: ImportSession["exercises"][number]["punkty"];
      czas?: ImportSession["exercises"][number]["czas"];
    }
  ) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.index === index ? { ...exercise, ...patch } : exercise
        ),
      };
    });

    const updated = await patchExercise(index, patch);

    if (updated) {
      await loadDuplicates();
    }
  }

  if (loading) {
    return (
      <div className="import-panel import-panel--loading">
        Ładowanie podglądu importu...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="import-panel import-panel--error">
        <p>{error ?? "Brak sesji importu."}</p>
        <Link href="/nauczyciel/import" className="import-link">
          Wróć do importu
        </Link>
      </div>
    );
  }

  const selectedCount = session.exercises.filter(
    (exercise) => exercise.selected
  ).length;
  const savedCount = session.exercises.filter(
    (exercise) => exercise.saved
  ).length;

  return (
    <section className="import-preview">
      <ImportStepIndicator current="preview" />

      <header className="import-preview__header">
        <div>
          <h1 className="import-preview__title">Podgląd importu</h1>
          <p className="import-preview__subtitle">
            {session.fileName} · {session.pageCount} str. ·{" "}
            {session.exercises.length} zadań wykrytych
            {session.aiUsed ? " · parser AI" : " · parser regułowy"}
          </p>
          {savedKod && (
            <p className="import-preview__saved-banner">
              Zapisano zadanie do bazy: {savedKod}
            </p>
          )}
        </div>

        <Link href="/nauczyciel/import" className="import-link">
          Nowy import
        </Link>
      </header>

      {(session.ocrWarnings.length > 0 ||
        session.parseWarnings.length > 0) && (
        <div className="import-preview__warnings">
          {[...session.ocrWarnings, ...session.parseWarnings].map(
            (warning) => (
              <p key={warning}>{warning}</p>
            )
          )}
        </div>
      )}

      <ImportMetadataForm
        value={session.metadata}
        disabled={savingMetadata}
        onChange={(metadata) => {
          setSession((current) =>
            current ? { ...current, metadata } : current
          );
        }}
      />

      <div className="import-preview__actions">
        <button
          type="button"
          className="import-button import-button--secondary"
          disabled={savingMetadata || savingAll}
          onClick={() => void persistMetadata(session.metadata)}
        >
          Zapisz metadane importu
        </button>

        <button
          type="button"
          className="import-button import-button--primary"
          disabled={savingMetadata || savingAll || selectedCount === 0}
          onClick={() => void saveAllSelected()}
        >
          {savingAll
            ? "Zapisywanie zadań..."
            : "Potwierdź i zapisz zaznaczone do bazy"}
        </button>

        <p className="import-preview__stats">
          Zaznaczone: {selectedCount} · Zapisane: {savedCount}
        </p>
      </div>

      <div className="import-preview__list">
        {session.exercises.map((exercise) => {
          const duplicate = duplicates.get(exercise.index);
          const duplicateStatus = duplicate?.status ?? "new";
          const decision =
            duplicateDecisions.get(exercise.index) ??
            defaultDuplicateDecision(duplicateStatus);
          const exerciseMetadata = resolveExerciseScope(
            session.metadata,
            exercise
          );

          const metadataLine = formatExerciseMetadataLine(
            exercise,
            taskSourceLabel(exerciseMetadata.zrodlo),
            exerciseMetadata.zrodlo
          );
          const cardTitle = formatExerciseCardTitle(
            exercise,
            exerciseMetadata.zrodlo
          );

          return (
            <article
              key={exercise.index}
              className={[
                "import-exercise-card",
                exercise.saved ? "import-exercise-card--saved" : "",
                !exercise.selected ? "import-exercise-card--skipped" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <header className="import-exercise-card__header">
                <label className="import-exercise-card__select">
                  <input
                    type="checkbox"
                    checked={exercise.selected}
                    disabled={exercise.saved}
                    onChange={(event) =>
                      void toggleSelected(
                        exercise.index,
                        event.target.checked
                      )
                    }
                  />
                  <span className="import-exercise-card__title">
                    <span className="import-exercise-card__number">
                      {cardTitle}
                    </span>
                    {metadataLine && (
                      <span className="import-exercise-card__identifier">
                        {metadataLine}
                      </span>
                    )}
                  </span>
                </label>

                {exercise.saved && exercise.savedKod && (
                  <div className="import-exercise-card__meta">
                    <span className="import-exercise-card__saved">
                      Zapisano: {exercise.savedKod}
                    </span>
                  </div>
                )}
              </header>

              {duplicate && !exercise.saved && (
                <div
                  className={[
                    "import-exercise-card__duplicate",
                    duplicateStatus === "new"
                      ? "import-exercise-card__duplicate--new"
                      : "",
                    duplicateStatus === "content"
                      ? "import-exercise-card__duplicate--content"
                      : "",
                    duplicateStatus === "exact"
                      ? "import-exercise-card__duplicate--exact"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{duplicateLabel(duplicateStatus)}</span>

                  {duplicate.existing && (
                    <span>
                      {duplicate.existing.kod} ·{" "}
                      {taskSourceLabel(duplicate.existing.zrodlo)} ·{" "}
                      {formatExistingTaskIdentifiers(duplicate.existing)}
                    </span>
                  )}

                  {duplicate.existing && (
                    <Link
                      href={`/nauczyciel/edytor/${duplicate.existing.id}`}
                      className="import-link"
                    >
                      Otwórz istniejące
                    </Link>
                  )}

                  {duplicateStatus !== "new" && (
                    <div className="import-exercise-card__duplicate-actions">
                      <label>
                        <input
                          type="radio"
                          name={`dup-${exercise.index}`}
                          checked={decision === "skip"}
                          onChange={() =>
                            setDuplicateDecision(exercise.index, "skip")
                          }
                        />
                        Pomiń
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`dup-${exercise.index}`}
                          checked={decision === "replace"}
                          onChange={() =>
                            setDuplicateDecision(exercise.index, "replace")
                          }
                        />
                        Zastąp
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`dup-${exercise.index}`}
                          checked={decision === "save"}
                          onChange={() =>
                            setDuplicateDecision(exercise.index, "save")
                          }
                        />
                        Zapisz mimo to
                      </label>
                    </div>
                  )}
                </div>
              )}

              <ImportExerciseMetadataPanel
                sessionMetadata={session.metadata}
                exercise={exercise}
                disabled={exercise.saved || savingAll}
                onChange={(patch) =>
                  void updateExerciseMetadata(exercise.index, patch)
                }
              />

              <div className="import-exercise-card__content">
                {hasDocumentContent(exercise.tresc) ? (
                  <DocumentViewer value={exercise.tresc} preview />
                ) : (
                  <p className="import-exercise-card__empty">
                    Brak treści — popraw w edytorze.
                  </p>
                )}
              </div>

              <div className="import-exercise-card__answer">
                <p className="import-exercise-card__answer-label">Odpowiedź</p>
                {hasAnswerContent(exercise.odpowiedz) ? (
                  <DocumentViewer
                    value={exercise.odpowiedz}
                    preview
                    compact
                  />
                ) : (
                  <p className="import-exercise-card__empty">
                    Brak odpowiedzi w imporcie
                  </p>
                )}
              </div>

              <footer className="import-exercise-card__footer">
                <button
                  type="button"
                  className="import-button"
                  onClick={() => void openExerciseEditor(exercise.index)}
                >
                  {exercise.saved ? "Ponownie edytuj" : "Korekta w edytorze"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
