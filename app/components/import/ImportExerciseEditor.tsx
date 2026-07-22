"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import SolutionEditor from "@/app/components/database/SolutionEditor";
import ShortAnswer from "@/app/components/database/ShortAnswer";
import TaskEditor from "@/app/components/database/TaskEditor";
import Toolbar from "@/app/components/editor/Toolbar";
import type { EditorHandle, EditorToolbarTarget } from "@/app/components/editor/Editor";
import {
  setActiveEditorShortcutTarget,
  setActiveEditorSurface,
} from "@/app/components/editor/activeSurface";
import { ensureDocumentInlineEditing } from "@/app/components/editor/core/document";
import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import type { EditorDocument } from "@/app/components/editor/types";
import type { ImportSession, ParsedExercise } from "@/app/lib/import/types";
import {
  exerciseScopeIsComplete,
  resolveExerciseScope,
} from "@/app/lib/import/exerciseMetadata";

import ImportExerciseMetadataPanel from "./ImportExerciseMetadataPanel";
import ImportMetadataSummary from "./ImportMetadataSummary";
import ImportStepIndicator from "./ImportStepIndicator";
import "../editor/editor-split-layout.css";
import "./task-editor-layout.css";

type Props = {
  sessionId: string;
  exerciseIndex: number;
};

function loadDocument(value: unknown): EditorDocument {
  const document =
    parseEditorDocument(value) ?? ensureDocumentInlineEditing({
      version: 1,
      paragraphs: [],
    });

  return ensureDocumentInlineEditing(document);
}

export default function ImportExerciseEditor({
  sessionId,
  exerciseIndex,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<EditorHandle | null>(null);
  const [activeToolbar, setActiveToolbar] =
    useState<EditorToolbarTarget | null>(null);
  const [, setToolbarRevision] = useState(0);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [exercise, setExercise] = useState<ParsedExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadSession = useCallback(async () => {
    const response = await fetch(`/api/import/${sessionId}`);

    if (!response.ok) {
      throw new Error("Sesja importu wygasła lub nie istnieje.");
    }

    const payload = (await response.json()) as ImportSession;
    const current = payload.exercises.find(
      (item) => item.index === exerciseIndex
    );

    if (!current) {
      throw new Error("Nie znaleziono zadania w sesji importu.");
    }

    setSession(payload);
    setExercise({
      ...current,
      tresc: loadDocument(current.tresc),
      rozwiazanie: loadDocument(current.rozwiazanie),
      odpowiedz: loadDocument(current.odpowiedz),
    });
  }, [exerciseIndex, sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadSession();

        if (!cancelled) {
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać zadania."
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
  }, [loadSession]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorActivate = useCallback(
    (target: EditorToolbarTarget) => {
      setActiveToolbar(target);
      setToolbarRevision((revision) => revision + 1);

      const surface = target.editorRoot.current;

      if (surface) {
        setActiveEditorShortcutTarget({
          surface,
          onInsertMath: target.onInsertMath,
          onInsertMathTemplate: target.onInsertMathTemplate,
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!mounted || !editorRef.current) {
      return;
    }

    setActiveToolbar(editorRef.current);
  }, [mounted]);

  async function flushEditorState() {
    window.mathVirtualKeyboard?.hide();

    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      active.blur();
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async function saveDraft() {
    if (!exercise) {
      return;
    }

    setSavingDraft(true);

    try {
      const response = await fetch(
        `/api/import/${sessionId}/exercises/${exerciseIndex}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: exercise.number,
            tresc: exercise.tresc,
            rozwiazanie: exercise.rozwiazanie,
            odpowiedz: exercise.odpowiedz,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Nie udało się zapisać korekty.");
      }

      const payload = (await response.json()) as ImportSession;
      setSession(payload);
      alert("Korekta zapisana w sesji importu. Baza danych nie została zmieniona.");
    } catch (draftError) {
      alert(
        draftError instanceof Error
          ? draftError.message
          : "Nie udało się zapisać korekty."
      );
    } finally {
      setSavingDraft(false);
    }
  }

  async function saveToDatabase() {
    if (!session || !exercise) {
      return;
    }

    const exerciseMetadata = resolveExerciseScope(
      session.metadata,
      exercise
    );

    if (!exerciseScopeIsComplete(exerciseMetadata)) {
      alert(
        "Uzupełnij klasę, dział i temat w metadanych tego zadania."
      );
      return;
    }

    const confirmed = window.confirm(
      `Zapisać zadanie ${exercise.number ?? exercise.index + 1} do bazy danych?\n\nTa operacja jest nieodwracalna w ramach importu — zadanie otrzyma nowy kod EDU-.`
    );

    if (!confirmed) {
      return;
    }

    await flushEditorState();
    setSavingToDb(true);

    try {
      const metadataResponse = await fetch(`/api/import/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: session.metadata }),
      });

      if (!metadataResponse.ok) {
        throw new Error("Nie udało się zapisać metadanych przed zapisem do bazy.");
      }

      const response = await fetch(`/api/import/${sessionId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exerciseIndexes: [exerciseIndex],
          onlySelected: false,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Błąd zapisu zadania.");
      }

      const saved = payload?.saved?.[0];

      if (!saved) {
        const skipped = payload?.skipped?.[0];

        if (skipped?.reason?.startsWith("duplicate-")) {
          throw new Error(
            "Zadanie zostało pominięte jako duplikat. Wróć do podglądu importu i wybierz inną akcję."
          );
        }

        throw new Error("Nie udało się zapisać zadania.");
      }

      const patchResponse = await fetch(
        `/api/import/${sessionId}/exercises/${exerciseIndex}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tresc: exercise.tresc,
            rozwiazanie: exercise.rozwiazanie,
            odpowiedz: exercise.odpowiedz,
          }),
        }
      );

      if (!patchResponse.ok) {
        console.error("Failed to update import session after save");
      }

      router.push(
        `/nauczyciel/import/${sessionId}?zapisane=${encodeURIComponent(saved.kod)}`
      );
    } catch (saveError) {
      alert(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać zadania."
      );
    } finally {
      setSavingToDb(false);
    }
  }

  if (loading) {
    return (
      <div className="import-panel import-panel--loading">
        Ładowanie edytora korekty...
      </div>
    );
  }

  if (error || !session || !exercise) {
    return (
      <div className="import-panel import-panel--error">
        <p>{error ?? "Brak zadania."}</p>
        <Link
          href={`/nauczyciel/import/${sessionId}`}
          className="import-link"
        >
          Wróć do podglądu
        </Link>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="import-panel import-panel--loading">
        Ładowanie edytora...
      </div>
    );
  }

  return (
    <div className="import-editor flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[#1E2128] p-6">
      <ImportStepIndicator current="edit" />

      <header className="import-editor__header">
        <div>
          <h1 className="import-editor__title">
            Korekta zadania {exercise.number ?? exercise.index + 1}
          </h1>
          <p className="import-editor__subtitle">
            {session.fileName} · edycja przed zapisem do bazy
          </p>
        </div>

        <Link
          href={`/nauczyciel/import/${sessionId}`}
          className="import-link"
        >
          Wróć do podglądu
        </Link>
      </header>

      <ImportMetadataSummary
        metadata={session.metadata}
        sessionId={sessionId}
      />

      <ImportExerciseMetadataPanel
        sessionMetadata={session.metadata}
        exercise={exercise}
        disabled={exercise.saved || savingToDb}
        onChange={async (patch) => {
          const response = await fetch(
            `/api/import/${sessionId}/exercises/${exerciseIndex}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(patch),
            }
          );

          if (!response.ok) {
            alert("Nie udało się zapisać metadanych zadania.");
            return;
          }

          const payload = (await response.json()) as ImportSession;
          setSession(payload);
          setExercise(
            payload.exercises.find((item) => item.index === exerciseIndex) ??
              null
          );
        }}
      />

      <div className="import-editor__notice">
        Zmiany w edytorze nie trafiają do bazy automatycznie. Najpierw zapisz
        korektę w sesji, potem potwierdź zapis do bazy.
      </div>

      <div className="task-editor-form-chrome mt-4 flex-shrink-0">
        {activeToolbar ? (
          <div
            className="task-editor-toolbar overflow-hidden rounded-xl border border-zinc-700"
            onMouseDown={() => {
              const surface = activeToolbar.editorRoot.current;

              if (surface) {
                setActiveEditorSurface(surface);
              }
            }}
          >
            <Toolbar
              editorRoot={activeToolbar.editorRoot}
              onInsertMath={activeToolbar.onInsertMath}
              ensureMathFocus={activeToolbar.ensureMathFocus}
              onInsertImage={activeToolbar.onInsertImage}
              onReplaceImage={() => activeToolbar.onReplaceImage?.()}
              onAlignImage={(align) => activeToolbar.onAlignImage?.(align)}
              hasSelectedImage={activeToolbar.hasSelectedImage?.() ?? false}
              selectedImageAlign={
                activeToolbar.getSelectedImageAlign?.() ?? "left"
              }
              editorMode={activeToolbar.getEditorMode?.() ?? "select"}
              onEditorModeChange={(mode) => {
                activeToolbar.onEditorModeChange?.(mode);
                setToolbarRevision((revision) => revision + 1);
              }}
              inkColor={activeToolbar.getInkColor?.() ?? "#1e293b"}
              onInkColorChange={(color) => {
                activeToolbar.onInkColorChange?.(color);
                setToolbarRevision((revision) => revision + 1);
              }}
              onInsertInk={() => {
                activeToolbar.onInsertInk?.();
                setToolbarRevision((revision) => revision + 1);
              }}
              onAlignInk={(align) => activeToolbar.onAlignInk?.(align)}
              hasSelectedInk={activeToolbar.hasSelectedInk?.() ?? false}
              selectedInkAlign={
                activeToolbar.getSelectedInkAlign?.() ?? "left"
              }
              onConvertInkToMath={() => {
                activeToolbar.onConvertInkToMath?.();
                setToolbarRevision((revision) => revision + 1);
              }}
              onDuplicateBlocks={() => activeToolbar.duplicateBlocks?.()}
              onMoveBlocksUp={() => activeToolbar.moveBlocksUp?.()}
              onMoveBlocksDown={() => activeToolbar.moveBlocksDown?.()}
              onToggleOutline={() => activeToolbar.toggleOutline?.()}
              outlineVisible={activeToolbar.getOutlineVisible?.() ?? false}
              hasBlockSelection={activeToolbar.hasBlockSelection?.() ?? false}
            />
          </div>
        ) : null}
      </div>

      <div className="import-editor__workspace task-editor-workspace mt-4">
        <TaskEditor
          ref={editorRef}
          value={exercise.tresc}
          onChange={(document) =>
            setExercise((current) =>
              current ? { ...current, tresc: document } : current
            )
          }
          onActivate={handleEditorActivate}
        />

        <div className="task-editor-workspace__sidebar">
          <ShortAnswer
            value={exercise.odpowiedz}
            onChange={(document) =>
              setExercise((current) =>
                current
                  ? { ...current, odpowiedz: document }
                  : current
              )
            }
            onActivate={handleEditorActivate}
          />

          <SolutionEditor
            value={exercise.rozwiazanie}
            onChange={(document) =>
              setExercise((current) =>
                current
                  ? { ...current, rozwiazanie: document }
                  : current
                )
            }
            onActivate={handleEditorActivate}
          />
        </div>
      </div>

      <footer className="import-editor__footer">
        <button
          type="button"
          className="import-button import-button--secondary"
          disabled={savingDraft || savingToDb}
          onClick={() => void saveDraft()}
        >
          Zapisz korektę (sesja)
        </button>

        <button
          type="button"
          className="import-button import-button--primary"
          disabled={savingDraft || savingToDb}
          onClick={() => void saveToDatabase()}
        >
          {savingToDb
            ? "Zapisywanie..."
            : "Potwierdź i zapisz do bazy"}
        </button>
      </footer>
    </div>
  );
}
