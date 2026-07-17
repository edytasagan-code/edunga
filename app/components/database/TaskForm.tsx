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

import EdungaWatermark from "@/app/components/brand/EdungaWatermark";
import {
  createEmptyAnswerDocument,
  normalizeAnswerDocument,
  shouldLockSolutionFirstLine,
  syncAnswerToSolution,
} from "@/app/lib/answerDocument";

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

function loadAnswerDocument(
  value: unknown,
  seed?: string
): EditorDocument {
  const document =
    parseEditorDocument(value) ?? createEmptyAnswerDocument(seed);

  return normalizeAnswerDocument(
    ensureDocumentInlineEditing(document),
    seed
  );
}

/** Treść starts with an inline math field (same as Odpowiedź). */
function loadTrescDocument(
  value: unknown,
  seed?: string
): EditorDocument {
  return loadAnswerDocument(value, seed);
}

function createDefaultVariants(): VariantDocuments[] {
  const odpowiedz = createEmptyAnswerDocument("odpowiedz");

  return [
    {
      tresc: createEmptyAnswerDocument("tresc"),
      rozwiazanie: syncAnswerToSolution(
        odpowiedz,
        createEmptyDocument("rozwiazanie")
      ),
      odpowiedz,
    },
  ];
}

function variantsFromResponse(data: ZadanieResponse): VariantDocuments[] {
  return normalizeVariants(data).map((variant, index) => ({
    tresc: loadTrescDocument(variant.tresc, `tresc-${index}`),
    rozwiazanie: loadDocument(variant.rozwiazanie),
    odpowiedz: loadAnswerDocument(
      variant.odpowiedz,
      `odpowiedz-${index}`
    ),
  }));
}

function cloneVariantDocuments(
  variant: VariantDocuments
): VariantDocuments {
  return {
    tresc: loadTrescDocument(
      JSON.parse(JSON.stringify(variant.tresc)),
      "tresc-clone"
    ),
    rozwiazanie: loadDocument(
      JSON.parse(JSON.stringify(variant.rozwiazanie))
    ),
    odpowiedz: loadAnswerDocument(
      JSON.parse(JSON.stringify(variant.odpowiedz)),
      `odpowiedz-clone`
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
  const solutionFirstLineLockedRef = useRef<Record<number, boolean>>({});
  const syncingAnswerToSolutionRef = useRef(false);

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

        const loaded = variantsFromResponse(data);
        loaded.forEach((variant, index) => {
          if (
            shouldLockSolutionFirstLine(
              variant.odpowiedz,
              variant.rozwiazanie
            )
          ) {
            solutionFirstLineLockedRef.current[index] = true;
          }
        });

        setVariants(loaded);
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

  function handleOdpowiedzChange(value: EditorDocument) {
    setVariants((prev) =>
      prev.map((variant, index) => {
        if (index !== activeVariantIndex) {
          return variant;
        }

        if (solutionFirstLineLockedRef.current[index]) {
          return { ...variant, odpowiedz: value };
        }

        syncingAnswerToSolutionRef.current = true;
        const rozwiazanie = syncAnswerToSolution(
          value,
          variant.rozwiazanie
        );
        syncingAnswerToSolutionRef.current = false;

        return { ...variant, odpowiedz: value, rozwiazanie };
      })
    );
  }

  function handleRozwiazanieChange(value: EditorDocument) {
    setVariants((prev) =>
      prev.map((variant, index) => {
        if (index !== activeVariantIndex) {
          return variant;
        }

        if (!syncingAnswerToSolutionRef.current) {
          if (
            shouldLockSolutionFirstLine(variant.odpowiedz, value)
          ) {
            solutionFirstLineLockedRef.current[index] = true;
          }
        }

        return { ...variant, rozwiazanie: value };
      })
    );
  }

  function addVariant() {
    if (variants.length >= MAX_VARIANTS) {
      return;
    }

    const source = variants[activeVariantIndex] ?? variants[0];
    const newIndex = variants.length;
    solutionFirstLineLockedRef.current[newIndex] =
      solutionFirstLineLockedRef.current[activeVariantIndex] ??
      false;
    setVariants((prev) => [...prev, cloneVariantDocuments(source)]);
    setActiveVariantIndex(newIndex);
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
      <div
        className="rounded-xl border border-zinc-800 p-6 text-zinc-100"
        style={{ background: "#0d0d0d" }}
      >
        Ładowanie zadania...
      </div>
    );
  }

  if (!mounted) {
    return (
      <div
        className="rounded-xl border border-zinc-800 p-6 text-zinc-100"
        style={{ background: "#0d0d0d" }}
      >
        Ładowanie edytora...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="rounded-xl border border-zinc-800 p-6 text-zinc-100"
        style={{ background: "#0d0d0d" }}
      >
        {loadError}
      </div>
    );
  }

  const isPazdroSource = zrodlo === "pazdro";

  return (
    <div
      className="relative flex flex-col rounded-xl border border-zinc-800 p-6"
      style={{ background: "#0d0d0d", color: "#d4d4d8" }}
    >
      <EdungaWatermark />
      <div
        className="task-editor-form-chrome flex flex-shrink-0 flex-col gap-2.5"
        style={{ marginBottom: 20 }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="task-editor-form-chrome__title">
            {isEditing ? "Edytuj zadanie" : "Nowe zadanie"}
          </h1>

          {kod && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-sm text-amber-300">
              {kod}
            </span>
          )}
        </div>

        <div className="task-editor-form-chrome__row">
          <label className="task-editor-form-chrome__label">
            <span style={{ color: "#d4d4d8" }}>Źródło</span>
            <select
              value={zrodlo}
              onChange={(event) =>
                setZrodlo(event.target.value)
              }
              className="task-editor-form-chrome__field task-editor-form-chrome__select-sm"
              style={{ color: "#d4d4d8" }}
            >
              <option value="">—</option>
              {TASK_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isPazdroSource ? (
            <>
              <select
                value={dzialId}
                onChange={(e) => setDzialId(e.target.value)}
                disabled={!klasaId || loadingDzialy}
                className="task-editor-form-chrome__field task-editor-form-chrome__select-md"
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
                className="task-editor-form-chrome__field task-editor-form-chrome__select-md"
              >
                <option value="">Temat (Pazdro)</option>

                {tematyDzialu.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nazwa}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <label className="task-editor-form-chrome__label">
            <span style={{ color: "#d4d4d8" }}>Identyfikator</span>
            <input
              type="text"
              value={identyfikator}
              onChange={(event) =>
                setIdentyfikator(event.target.value)
              }
              placeholder="np. 5.23"
              maxLength={64}
              className="task-editor-form-chrome__field task-editor-form-chrome__identyfikator"
              style={{ color: "#d4d4d8" }}
            />
          </label>
        </div>
      </div>

      {/* Visible gap before Klasyfikacja */}
      <div aria-hidden style={{ height: 14, flexShrink: 0 }} />

      <div className="task-editor-form-chrome mb-0 flex-shrink-0 space-y-3.5">
        <div>
          <p className="task-editor-form-chrome__section">
            Klasyfikacja programowa
          </p>
          <div className="task-editor-form-chrome__row">
            <select
              value={mainTopicId}
              onChange={(e) => setMainTopicId(e.target.value)}
              disabled={loadingMainTopics}
              required
              aria-required="true"
              className="task-editor-form-chrome__field task-editor-form-chrome__field--required task-editor-form-chrome__select-md"
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
              className="task-editor-form-chrome__field task-editor-form-chrome__select-md"
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
              className="task-editor-form-chrome__field task-editor-form-chrome__select-md"
            />

            <select
              value={klasaId}
              onChange={(e) => setKlasaId(e.target.value)}
              disabled={loadingKlasy}
              className="task-editor-form-chrome__field task-editor-form-chrome__klasa"
            >
              <option value="">Klasa</option>

              {klasy.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nazwa}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="task-editor-form-chrome__row"
          style={{ paddingTop: 12 }}
        >
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="task-editor-form-chrome__field task-editor-form-chrome__select-md"
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
            className="task-editor-form-chrome__field task-editor-form-chrome__select-sm"
          >
            <option value="">Poziom</option>
            <option value="1">★☆☆☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="3">★★★☆☆</option>
            <option value="4">★★★★☆</option>
            <option value="5">★★★★★</option>
          </select>

          <label className="task-editor-form-chrome__label">
            <span style={{ color: "#d4d4d8" }}>Punkty</span>
            <input
              type="number"
              value={punkty}
              onChange={(e) => setPunkty(e.target.value)}
              className="task-editor-form-chrome__field task-editor-form-chrome__num"
              style={{ color: "#d4d4d8" }}
            />
          </label>

          <label className="task-editor-form-chrome__label">
            <span style={{ color: "#d4d4d8" }}>Czas (min)</span>
            <input
              type="number"
              value={czas}
              onChange={(e) => setCzas(e.target.value)}
              className="task-editor-form-chrome__field task-editor-form-chrome__num"
              style={{ color: "#d4d4d8" }}
            />
          </label>
        </div>
      </div>

      <div className="task-editor-form-chrome mb-0 flex-shrink-0">
        <VariantTabs
          count={variants.length}
          activeIndex={activeVariantIndex}
          onSelect={setActiveVariantIndex}
          onAdd={addVariant}
        />
      </div>

      {activeToolbar && !solutionExpanded ? (
        <div
          className="task-editor-toolbar"
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
            hasSelectedImage={
              activeToolbar.hasSelectedImage?.() ?? false
            }
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
            onConvertInkToMath={() => {
              activeToolbar.onConvertInkToMath?.();
              refreshToolbar();
            }}
            onDuplicateBlocks={() => activeToolbar.duplicateBlocks?.()}
            onMoveBlocksUp={() => activeToolbar.moveBlocksUp?.()}
            onMoveBlocksDown={() => activeToolbar.moveBlocksDown?.()}
            onToggleOutline={() => activeToolbar.toggleOutline?.()}
            outlineVisible={
              activeToolbar.getOutlineVisible?.() ?? false
            }
            hasBlockSelection={
              activeToolbar.hasBlockSelection?.() ?? false
            }
          />
        </div>
      ) : null}

      <div className="task-editor-workspace task-editor-workspace--teacher mt-4">
        <div className="task-editor-workspace__left">
          <TaskEditor
            key={`tresc-${activeVariantIndex}`}
            ref={trescEditorRef}
            value={currentVariant.tresc}
            onChange={(value) => updateCurrentVariant({ tresc: value })}
            onActivate={handleEditorActivate}
          />

          <ShortAnswer
            key={`odpowiedz-${activeVariantIndex}`}
            ref={odpowiedzEditorRef}
            value={currentVariant.odpowiedz}
            onChange={handleOdpowiedzChange}
            onActivate={handleEditorActivate}
            variantSeed={`odpowiedz-${activeVariantIndex}`}
          />
        </div>

        <div className="task-editor-workspace__right">
          <SolutionEditor
            key={`rozwiazanie-${activeVariantIndex}`}
            ref={rozwiazanieEditorRef}
            value={currentVariant.rozwiazanie}
            onChange={handleRozwiazanieChange}
            onActivate={handleEditorActivate}
            onExpandedChange={setSolutionExpanded}
            toolbar={
              activeToolbar ? (
                <div
                  className="task-editor-toolbar"
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
                    onConvertInkToMath={() => {
                      activeToolbar.onConvertInkToMath?.();
                      refreshToolbar();
                    }}
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

      <div
        className="task-editor-save-bar relative mt-4 flex flex-shrink-0 flex-col items-end gap-2 border-t border-zinc-800 pt-4"
        style={{ background: "#0d0d0d" }}
      >
        {saveError ? (
          <p
            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
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
