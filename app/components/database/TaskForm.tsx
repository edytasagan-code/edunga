"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Toolbar from "../editor/Toolbar";
import type { EditorHandle, EditorToolbarTarget } from "../editor/Editor";
import { setActiveEditorShortcutTarget, setActiveEditorSurface } from "../editor/activeSurface";
import { parseEditorDocument } from "../editor/parseEditorDocument";
import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
} from "../editor/core/document";
import { EditorDocument } from "../editor/types";

import TaskEditor from "./TaskEditor";
import SolutionEditor from "./SolutionEditor";
import ShortAnswer from "./ShortAnswer";
import VariantTabs from "./VariantTabs";
import "./task-editor-layout.css";

import {
  MAX_VARIANTS,
  normalizeVariants,
  type TaskVariantContent,
} from "@/app/lib/variants";
import { useCurriculum } from "@/app/lib/curriculum/useCurriculum";
import { useCurriculumTopics } from "@/app/lib/curriculum/useCurriculumTopics";
import {
  normalizeTaskIdentifier,
  normalizeTaskSource,
  TASK_SOURCE_OPTIONS,
} from "@/app/lib/taskSource";

type Props = {
  taskId?: string;
};

type ZadanieResponse = {
  id: string;
  kod: string;
  klasaId: string;
  dzialId: string;
  tematId: string;
  mainTopicId?: string | null;
  subtopicId?: string | null;
  zagadnienie?: string | null;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  zrodlo?: string | null;
  identyfikator?: string | null;
  tresc: unknown;
  rozwiazanie: unknown;
  odpowiedz: unknown;
  warianty?: unknown;
};

type VariantDocuments = {
  tresc: EditorDocument;
  rozwiazanie: EditorDocument;
  odpowiedz: EditorDocument;
};

function loadDocument(value: unknown): EditorDocument {
  const document =
    parseEditorDocument(value) ?? createEmptyDocument();

  return ensureDocumentInlineEditing(document);
}

function createDefaultVariants(): VariantDocuments[] {
  return [
    {
      tresc: createEmptyDocument("tresc"),
      rozwiazanie: createEmptyDocument("rozwiazanie"),
      odpowiedz: createEmptyDocument("odpowiedz"),
    },
  ];
}

function variantsFromResponse(data: ZadanieResponse): VariantDocuments[] {
  return normalizeVariants(data).map((variant) => ({
    tresc: loadDocument(variant.tresc),
    rozwiazanie: loadDocument(variant.rozwiazanie),
    odpowiedz: loadDocument(variant.odpowiedz),
  }));
}

function cloneVariantDocuments(
  variant: VariantDocuments
): VariantDocuments {
  return {
    tresc: loadDocument(JSON.parse(JSON.stringify(variant.tresc))),
    rozwiazanie: loadDocument(
      JSON.parse(JSON.stringify(variant.rozwiazanie))
    ),
    odpowiedz: loadDocument(
      JSON.parse(JSON.stringify(variant.odpowiedz))
    ),
  };
}

function toVariantPayload(
  variants: VariantDocuments[]
): TaskVariantContent[] {
  return variants.map((variant) => ({
    tresc: variant.tresc,
    rozwiazanie: variant.rozwiazanie,
    odpowiedz: variant.odpowiedz,
  }));
}

export default function TaskForm({ taskId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("duplikuj");
  const isEditing = Boolean(taskId);
  const sourceId = taskId ?? duplicateFromId;

  const [loading, setLoading] = useState(Boolean(sourceId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    klasy,
    dzialy: dzialyKlasy,
    tematy: tematyDzialu,
    klasaId,
    dzialId,
    tematId,
    setKlasaId,
    setDzialId,
    setTematId,
    loadingKlasy,
    loadingDzialy,
    loadingTematy,
  } = useCurriculum();

  const {
    mainTopics,
    subtopics,
    mainTopicId,
    subtopicId,
    setMainTopicId,
    setSubtopicId,
    loadingMainTopics,
    loadingSubtopics,
  } = useCurriculumTopics();

  const [typ, setTyp] = useState("");
  const [poziom, setPoziom] = useState("");

  const [punkty, setPunkty] = useState("");
  const [czas, setCzas] = useState("");
  const [zrodlo, setZrodlo] = useState("");
  const [identyfikator, setIdentyfikator] = useState("");
  const [zagadnienie, setZagadnienie] = useState("");
  const [kod, setKod] = useState<string | null>(null);

  const [variants, setVariants] = useState<VariantDocuments[]>(
    createDefaultVariants
  );
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeToolbar, setActiveToolbar] =
    useState<EditorToolbarTarget | null>(null);
  const [solutionExpanded, setSolutionExpanded] = useState(false);
  const [, setToolbarRevision] = useState(0);
  const trescEditorRef = useRef<EditorHandle | null>(null);
  const odpowiedzEditorRef = useRef<EditorHandle | null>(null);
  const rozwiazanieEditorRef = useRef<EditorHandle | null>(null);

  const refreshToolbar = useCallback(() => {
    setToolbarRevision((revision) => revision + 1);
  }, []);

  const handleEditorActivate = useCallback(
    (target: EditorToolbarTarget) => {
      setActiveToolbar(target);
      refreshToolbar();

      const surface = target.editorRoot.current;

      if (surface) {
        setActiveEditorShortcutTarget({
          surface,
          onInsertMath: target.onInsertMath,
          onInsertMathTemplate: target.onInsertMathTemplate,
        });
      }
    },
    [refreshToolbar]
  );

  useEffect(() => {
    if (!activeToolbar) {
      return;
    }

    const surface = activeToolbar.editorRoot.current;

    if (!surface) {
      return;
    }

    setActiveEditorShortcutTarget({
      surface,
      onInsertMath: activeToolbar.onInsertMath,
      onInsertMathTemplate: activeToolbar.onInsertMathTemplate,
    });
  }, [activeToolbar]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (trescEditorRef.current) {
        setActiveToolbar(trescEditorRef.current);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [activeVariantIndex, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentVariant = variants[activeVariantIndex] ?? variants[0];

  useEffect(() => {
    if (!sourceId) {
      return;
    }

    async function loadTask() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/zadania/${sourceId}`);

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setLoadError(body?.error ?? "Nie udało się wczytać zadania.");
          return;
        }

        const data = (await response.json()) as ZadanieResponse;

        setKlasaId(data.klasaId, { preserveChildren: true });
        setDzialId(data.dzialId, { preserveChildren: true });
        setTematId(data.tematId);
        setMainTopicId(data.mainTopicId ?? "", { preserveChildren: true });
        setSubtopicId(data.subtopicId ?? "");
        setZagadnienie(data.zagadnienie?.trim() ?? "");
        setTyp(data.typ);
        setPoziom(String(data.poziom));
        setPunkty(String(data.punkty));
        setCzas(String(data.czas));
        setZrodlo(normalizeTaskSource(data.zrodlo));
        setIdentyfikator(
          normalizeTaskIdentifier(data.identyfikator)
        );

        if (isEditing) {
          setKod(data.kod);
        }

        setVariants(variantsFromResponse(data));
        setActiveVariantIndex(0);
      } catch {
        setLoadError("Nie udało się wczytać zadania.");
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [sourceId, isEditing, setKlasaId, setDzialId, setTematId, setMainTopicId, setSubtopicId]);

  function updateCurrentVariant(
    patch: Partial<VariantDocuments>
  ) {
    setVariants((prev) =>
      prev.map((variant, index) =>
        index === activeVariantIndex
          ? { ...variant, ...patch }
          : variant
      )
    );
  }

  function addVariant() {
    if (variants.length >= MAX_VARIANTS) {
      return;
    }

    const source = variants[activeVariantIndex] ?? variants[0];
    setVariants((prev) => [...prev, cloneVariantDocuments(source)]);
    setActiveVariantIndex(variants.length);
  }

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

  function collectVariantsForSave(): VariantDocuments[] {
    const active = variants[activeVariantIndex] ?? variants[0];

    const tresc =
      trescEditorRef.current?.commitDocument?.() ?? active.tresc;
    const odpowiedz =
      odpowiedzEditorRef.current?.commitDocument?.() ?? active.odpowiedz;
    const rozwiazanie =
      rozwiazanieEditorRef.current?.commitDocument?.() ??
      active.rozwiazanie;

    return variants.map((variant, index) =>
      index === activeVariantIndex
        ? { tresc, odpowiedz, rozwiazanie }
        : variant
    );
  }

  async function zapisz() {
    if (saving) {
      return;
    }

    setSaveError(null);

    if (!mainTopicId) {
      const message = "Uzupełnij temat główny.";
      setSaveError(message);
      alert(message);
      return;
    }

    await flushEditorState();

    const variantsForSave = collectVariantsForSave();

    setVariants(variantsForSave);

    const payload = {
      klasaId: klasaId || null,
      dzialId: dzialId || null,
      tematId: tematId || null,
      mainTopicId,
      subtopicId: subtopicId || null,
      zagadnienie: zagadnienie.trim() || null,
      typ: typ || "",
      poziom: Number(poziom) || 0,
      punkty: Number(punkty) || 0,
      czas: Number(czas) || 0,
      zrodlo: zrodlo || null,
      identyfikator: identyfikator.trim() || null,
      warianty: toVariantPayload(variantsForSave),
      tagi: [],
    };

    setSaving(true);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        30000
      );

      const response = await fetch(
        isEditing ? `/api/zadania/${taskId}` : "/api/zadania",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      window.clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = error?.error ?? "Błąd zapisu zadania.";
        setSaveError(message);
        alert(message);
        return;
      }

      router.push("/nauczyciel/baza-zadan?zapisane=1");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const message =
          "Zapis trwa zbyt długo. Odśwież stronę i spróbuj ponownie.";
        setSaveError(message);
        alert(message);
        return;
      }

      const message =
        "Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.";
      setSaveError(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[#1E2128] p-6 text-white">
        Ładowanie zadania...
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="rounded-xl bg-[#1E2128] p-6 text-white">
        Ładowanie edytora...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl bg-[#1E2128] p-6 text-white">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl bg-[#1E2128] p-6">
      <div className="task-editor-form-chrome mb-4 flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-4xl font-bold text-white">
          {isEditing ? "Edytuj zadanie" : "Nowe zadanie"}
        </h1>

        {kod && (
          <span className="rounded-lg bg-zinc-900 px-3 py-1 font-mono text-lg text-yellow-300">
            {kod}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3 border-l border-zinc-700 pl-4">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="whitespace-nowrap">Źródło</span>
            <select
              value={zrodlo}
              onChange={(event) =>
                setZrodlo(event.target.value)
              }
              className="rounded-lg bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none"
            >
              <option value="">—</option>
              {TASK_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="whitespace-nowrap">Identyfikator</span>
            <input
              type="text"
              value={identyfikator}
              onChange={(event) =>
                setIdentyfikator(event.target.value)
              }
              placeholder="np. 5.23"
              maxLength={64}
              className="w-36 rounded-lg bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </label>
        </div>
      </div>

      <div className="task-editor-form-chrome mb-6 flex-shrink-0 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">
            Klasyfikacja programowa
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={mainTopicId}
              onChange={(e) => setMainTopicId(e.target.value)}
              disabled={loadingMainTopics}
              required
              aria-required="true"
              className="rounded-lg bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Temat główny *</option>
              {mainTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.nazwa}
                </option>
              ))}
            </select>

            <select
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              disabled={!mainTopicId || loadingSubtopics}
              className="rounded-lg bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Podtemat (opcjonalnie)</option>
              {subtopics.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nazwa}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={zagadnienie}
              onChange={(e) => setZagadnienie(e.target.value)}
              placeholder="Zagadnienie (opcjonalnie)"
              maxLength={200}
              className="rounded-lg bg-zinc-800 p-3 text-white outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-500">
            Program źródłowy (Pazdro / Excel) — metadane
          </p>
          <div className="grid grid-cols-3 gap-4">
            <select
              value={klasaId}
              onChange={(e) => setKlasaId(e.target.value)}
              disabled={loadingKlasy}
              className="rounded-lg bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Klasa</option>

              {klasy.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nazwa}
                </option>
              ))}
            </select>

            <select
              value={dzialId}
              onChange={(e) => setDzialId(e.target.value)}
              disabled={!klasaId || loadingDzialy}
              className="rounded-lg bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Dział</option>

              {dzialyKlasy.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nazwa}
                </option>
              ))}
            </select>

            <select
              value={tematId}
              onChange={(e) => setTematId(e.target.value)}
              disabled={!dzialId || loadingTematy}
              className="rounded-lg bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Temat (Pazdro)</option>

              {tematyDzialu.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazwa}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Typ zadania</option>
            <option value="otwarte">Otwarte</option>
            <option value="zamkniete">Zamknięte</option>
            <option value="wybor-wielokrotny">Wielokrotny wybór (A–D)</option>
            <option value="prawda-falsz">Prawda / Fałsz</option>
            <option value="uzupelnij">Uzupełnij</option>
            <option value="dobierz">Dobierz</option>
            <option value="test">Test</option>
          </select>

          <select
            value={poziom}
            onChange={(e) => setPoziom(e.target.value)}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Poziom</option>
            <option value="1">★☆☆☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="3">★★★☆☆</option>
            <option value="4">★★★★☆</option>
            <option value="5">★★★★★</option>
          </select>

          <input
            type="number"
            value={punkty}
            onChange={(e) => setPunkty(e.target.value)}
            placeholder="Punkty"
            className="rounded-lg bg-zinc-800 p-3 text-white outline-none"
          />

          <input
            type="number"
            value={czas}
            onChange={(e) => setCzas(e.target.value)}
            placeholder="Czas (min)"
            className="rounded-lg bg-zinc-800 p-3 text-white outline-none"
          />
        </div>
      </div>

      <div className="task-editor-form-chrome mt-6 flex-shrink-0">
        <VariantTabs
          count={variants.length}
          activeIndex={activeVariantIndex}
          onSelect={setActiveVariantIndex}
          onAdd={addVariant}
        />
      </div>

      {activeToolbar && !solutionExpanded ? (
        <div
          className="task-editor-toolbar mt-4 overflow-hidden rounded-xl border border-zinc-700"
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
              refreshToolbar();
            }}
            inkColor={activeToolbar.getInkColor?.() ?? "#1e293b"}
            onInkColorChange={(color) => {
              activeToolbar.onInkColorChange?.(color);
              refreshToolbar();
            }}
            onInsertInk={() => {
              activeToolbar.onInsertInk?.();
              refreshToolbar();
            }}
            onAlignInk={(align) => activeToolbar.onAlignInk?.(align)}
            hasSelectedInk={activeToolbar.hasSelectedInk?.() ?? false}
            selectedInkAlign={
              activeToolbar.getSelectedInkAlign?.() ?? "left"
            }
            onDuplicateBlocks={() => activeToolbar.duplicateBlocks?.()}
            onMoveBlocksUp={() => activeToolbar.moveBlocksUp?.()}
            onMoveBlocksDown={() => activeToolbar.moveBlocksDown?.()}
            onToggleOutline={() => activeToolbar.toggleOutline?.()}
            outlineVisible={activeToolbar.getOutlineVisible?.() ?? false}
            hasBlockSelection={activeToolbar.hasBlockSelection?.() ?? false}
          />
        </div>
      ) : null}

      <div className="task-editor-workspace mt-4 min-h-0">
        <TaskEditor
          key={`tresc-${activeVariantIndex}`}
          ref={trescEditorRef}
          value={currentVariant.tresc}
          onChange={(value) => updateCurrentVariant({ tresc: value })}
          onActivate={handleEditorActivate}
        />

        <div className="task-editor-workspace__sidebar">
          <ShortAnswer
            key={`odpowiedz-${activeVariantIndex}`}
            ref={odpowiedzEditorRef}
            value={currentVariant.odpowiedz}
            onChange={(value) =>
              updateCurrentVariant({ odpowiedz: value })
            }
            onActivate={handleEditorActivate}
          />

          <SolutionEditor
            key={`rozwiazanie-${activeVariantIndex}`}
            ref={rozwiazanieEditorRef}
            value={currentVariant.rozwiazanie}
            onChange={(value) =>
              updateCurrentVariant({ rozwiazanie: value })
            }
            onActivate={handleEditorActivate}
            onExpandedChange={setSolutionExpanded}
            toolbar={
              activeToolbar ? (
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
                    onAlignImage={(align) =>
                      activeToolbar.onAlignImage?.(align)
                    }
                    hasSelectedImage={
                      activeToolbar.hasSelectedImage?.() ?? false
                    }
                    selectedImageAlign={
                      activeToolbar.getSelectedImageAlign?.() ?? "left"
                    }
                    editorMode={
                      activeToolbar.getEditorMode?.() ?? "select"
                    }
                    onEditorModeChange={(mode) => {
                      activeToolbar.onEditorModeChange?.(mode);
                      refreshToolbar();
                    }}
                    inkColor={
                      activeToolbar.getInkColor?.() ?? "#1e293b"
                    }
                    onInkColorChange={(color) => {
                      activeToolbar.onInkColorChange?.(color);
                      refreshToolbar();
                    }}
                    onInsertInk={() => {
                      activeToolbar.onInsertInk?.();
                      refreshToolbar();
                    }}
                    onAlignInk={(align) =>
                      activeToolbar.onAlignInk?.(align)
                    }
                    hasSelectedInk={
                      activeToolbar.hasSelectedInk?.() ?? false
                    }
                    selectedInkAlign={
                      activeToolbar.getSelectedInkAlign?.() ?? "left"
                    }
                    onDuplicateBlocks={() =>
                      activeToolbar.duplicateBlocks?.()
                    }
                    onMoveBlocksUp={() =>
                      activeToolbar.moveBlocksUp?.()
                    }
                    onMoveBlocksDown={() =>
                      activeToolbar.moveBlocksDown?.()
                    }
                    onToggleOutline={() =>
                      activeToolbar.toggleOutline?.()
                    }
                    outlineVisible={
                      activeToolbar.getOutlineVisible?.() ?? false
                    }
                    hasBlockSelection={
                      activeToolbar.hasBlockSelection?.() ?? false
                    }
                  />
                </div>
              ) : null
            }
          />
        </div>
      </div>

      <div className="task-editor-save-bar relative mt-4 flex flex-shrink-0 flex-col items-end gap-2 border-t border-zinc-700 bg-[#1E2128] pt-4">
        {saveError ? (
          <p
            className="w-full rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-2 text-sm text-red-100"
            role="alert"
          >
            {saveError}
          </p>
        ) : null}

        <button
          type="button"
          onPointerDown={() => {
            window.mathVirtualKeyboard?.hide();
          }}
          onClick={() => {
            void zapisz();
          }}
          disabled={saving}
          className="rounded-xl bg-yellow-400 px-8 py-3 text-lg font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Zapisywanie..." : "💾 Zapisz zadanie"}
        </button>
      </div>
    </div>
  );
}
