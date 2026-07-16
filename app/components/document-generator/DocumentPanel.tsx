"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import VariantTabs from "@/app/components/database/VariantTabs";
import DocumentViewer from "@/app/components/document-viewer";
import {
  DEFAULT_STUDENT_INSTRUCTIONS,
  GROUP_OPTIONS,
  displayForDocumentVersion,
  isDocumentAnswerAreaItem,
  isDocumentTaskItem,
  resolveDocumentGroupVersions,
  resolveItemVariantIndex,
  sortSelectedGroups,
  type DocumentAnswerAreaItem,
  type DocumentDisplayOptions,
  type DocumentType,
  type GeneratorDocument,
} from "@/app/lib/documentGenerator";
import {
  DOCUMENT_CLASS_OPTIONS,
  DOCUMENT_LEVEL_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  type DocumentClass,
  type DocumentLevel,
} from "@/app/lib/documentMetadata";
import type { DocumentProjectMetadata } from "@/app/lib/documentProject";
import {
  countDocumentTasks,
  defaultSplitAfterTask,
  isSubtaskPerCellLayout,
  isSubtaskGridLayout,
  normalizePrintLayout,
  PRINT_GRID_OPTIONS,
  printLayoutSummary,
  type PrintLayoutOptions,
} from "@/app/lib/printLayout";
import { resolveTaskContentForDocument } from "@/app/lib/documentTaskContent";
import { resolveAnswerAreaHeightPx } from "@/app/lib/answerAreaStyle";
import { formatTaskNumber } from "@/app/lib/taskNumbering";
import {
  detectSubtasks,
  effectiveSelectedSubtasks,
  normalizeSubtaskSelectionForStorage,
} from "@/app/lib/subtaskSelection";
import { normalizeVariants } from "@/app/lib/variants";

import {
  AnswerAreaBoxFromItem,
  patchAnswerAreaHeight,
} from "./AnswerAreaBox";
import AnswerAreaTypePicker from "./AnswerAreaTypePicker";
import CollapsibleSection from "./CollapsibleSection";
import {
  buildMeasuredScalesRecord,
  usePrintCellScale,
} from "./PrintCellScaleContext";
import SubtaskCheckboxPicker from "./SubtaskCheckboxPicker";
import type { GeneratorTask } from "./DocumentGenerator";

import "./document-panel.css";

type Props = {
  document: GeneratorDocument;
  taskMap: Map<string, GeneratorTask>;
  documentId?: string;
  documentKod?: string;
  metadata?: DocumentProjectMetadata;
  isDirty?: boolean;
  saving?: boolean;
  saveMessage?: { type: "success" | "error"; text: string } | null;
  onSave?: () => void;
  onTitleChange: (title: string) => void;
  onTypeChange: (type: DocumentType) => void;
  onMetadataChange?: (patch: Partial<DocumentProjectMetadata>) => void;
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, direction: -1 | 1) => void;
  onUpdateAnswerAreaItem: (
    entryId: string,
    patch: Partial<Pick<DocumentAnswerAreaItem, "areaType" | "heightCm" | "heightPx">>
  ) => void;
  onSetVariantIndex: (entryId: string, variantIndex: number) => void;
  onSetSelectedSubtasks: (
    entryId: string,
    selectedSubtasks?: string[]
  ) => void;
  onDisplayChange: (patch: Partial<DocumentDisplayOptions>) => void;
  onPrintLayoutChange: (patch: Partial<PrintLayoutOptions>) => void;
};

function taskVariantContent(
  task: GeneratorTask,
  variantIndex: number,
  selectedSubtasks?: string[],
  renumberSelectedSubtasks = true
): unknown {
  return resolveTaskContentForDocument(task, variantIndex, {
    selectedSubtasks,
    renumberSelectedSubtasks,
  });
}

function downloadFilename(title: string): string {
  const base =
    title
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "dokument";

  return `${base}.pdf`;
}

export default function DocumentPanel({
  document,
  taskMap,
  documentId,
  documentKod,
  metadata,
  isDirty = false,
  saving = false,
  saveMessage = null,
  onSave,
  onTitleChange,
  onTypeChange,
  onMetadataChange,
  onRemove,
  onMove,
  onUpdateAnswerAreaItem,
  onSetVariantIndex,
  onSetSelectedSubtasks,
  onDisplayChange,
  onPrintLayoutChange,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [scrollToEntryId, setScrollToEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const itemsScrollRef = useRef<HTMLDivElement>(null);
  const knownEntryIdsRef = useRef<Set<string>>(new Set());
  const printCellScale = usePrintCellScale();
  const { display, printLayout } = document;
  const taskCount = countDocumentTasks(document.items);
  const normalizedPrintLayout = normalizePrintLayout(printLayout, taskCount);

  const printLayoutSummaryText = printLayoutSummary(
    normalizedPrintLayout,
    taskCount
  );

  const metadataSummary = [
    display.date || "brak daty",
    display.className || "brak klasy",
  ].join(" · ");

  const itemsSummary = formatItemCount(document.items.length);

  const [instructionsEditing, setInstructionsEditing] = useState(false);

  const totals = document.items.reduce(
    (acc, item) => {
      if (!isDocumentTaskItem(item)) {
        return acc;
      }

      const task = taskMap.get(item.taskId);

      if (!task) {
        return acc;
      }

      return {
        punkty: acc.punkty + task.punkty,
        czas: acc.czas + task.czas,
      };
    },
    { punkty: 0, czas: 0 }
  );
  const autoTotalPoints = `___ / ${totals.punkty}`;

  useEffect(() => {
    if (display.totalPointsCustomized) {
      return;
    }

    const next = autoTotalPoints;

    if (display.totalPoints !== next) {
      onDisplayChange({ totalPoints: next });
    }
  }, [
    autoTotalPoints,
    display.totalPoints,
    display.totalPointsCustomized,
    onDisplayChange,
  ]);

  useEffect(() => {
    const scrollContainer = itemsScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const currentIds = document.items.map((item) => item.entryId);
    const previousIds = knownEntryIdsRef.current;
    const addedEntryId = currentIds.find((entryId) => !previousIds.has(entryId));

    knownEntryIdsRef.current = new Set(currentIds);

    const targetEntryId =
      scrollToEntryId ?? (previousIds.size > 0 ? addedEntryId : undefined);

    if (addedEntryId) {
      const addedItem = document.items.find(
        (item) => item.entryId === addedEntryId
      );

      if (addedItem && isDocumentAnswerAreaItem(addedItem)) {
        setSelectedEntryId(addedEntryId);
      }
    }

    if (!targetEntryId) {
      return;
    }

    const target = scrollContainer.querySelector(
      `[data-entry-id="${targetEntryId}"]`
    );

    if (target instanceof HTMLElement) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      if (targetRect.top < containerRect.top) {
        scrollContainer.scrollTop -= containerRect.top - targetRect.top;
      } else if (targetRect.bottom > containerRect.bottom) {
        scrollContainer.scrollTop += targetRect.bottom - containerRect.bottom;
      }
    }

    if (scrollToEntryId) {
      setScrollToEntryId(null);
    }
  }, [document.items, scrollToEntryId]);

  useEffect(() => {
    if (
      selectedEntryId &&
      !document.items.some((item) => item.entryId === selectedEntryId)
    ) {
      setSelectedEntryId(null);
    }
  }, [document.items, selectedEntryId]);

  function handleMove(entryId: string, direction: -1 | 1) {
    onMove(entryId, direction);
    setScrollToEntryId(entryId);
  }

  async function exportPdf() {
    if (document.items.length === 0) {
      alert("Dodaj co najmniej jeden element do dokumentu.");
      return;
    }

    setExporting(true);

    try {
      const versions = resolveDocumentGroupVersions(document.display).map(
        (version) => {
          const versionDisplay = displayForDocumentVersion(
            document.display,
            version.group
          );

          return {
            display: versionDisplay,
            items: document.items.map((item) => {
              if (isDocumentAnswerAreaItem(item)) {
                return {
                  kind: "answer-area" as const,
                  areaType: item.areaType,
                  answerHeightPx: resolveAnswerAreaHeightPx(item),
                };
              }

              const variantIndex = resolveItemVariantIndex(item, version);
              const task = taskMap.get(item.taskId);
              const content = task
                ? taskVariantContent(
                    task,
                    variantIndex,
                    item.selectedSubtasks,
                    document.display.renumberSelectedSubtasks
                  )
                : null;

              return {
                kind: "task" as const,
                taskId: item.taskId,
                variantIndex,
                selectedSubtasks: item.selectedSubtasks,
                subtaskGridOffsets: item.subtaskGridOffsets,
                document: content,
              };
            }),
          };
        }
      );

      const response = await fetch("/api/generator/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: document.title,
          versions,
          printLayout: normalizedPrintLayout,
          measuredCellScales: printCellScale
            ? buildMeasuredScalesRecord(printCellScale.getCellScales())
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error ?? "Nie udało się wygenerować PDF.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = downloadFilename(document.title);
      link.style.display = "none";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      alert("Nie udało się wygenerować PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="document-panel edunga-panel flex h-full min-h-0 w-full flex-col overflow-hidden p-4 lg:p-5">
      <header className="document-panel__header mb-2 shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs edunga-text-muted">
          <p>
            {documentKod ? (
              <>
                <span className="edunga-text-muted">Kod:</span> {documentKod}
              </>
            ) : (
              "Niezapisany dokument"
            )}
            {isDirty ? (
              <span className="ml-2 text-amber-300"> · niezapisane zmiany</span>
            ) : null}
          </p>
          <Link
            href="/nauczyciel/biblioteka-dokumentow"
            className="edunga-text-body underline-offset-2 hover:text-[var(--edunga-ink)] hover:underline"
          >
            Biblioteka dokumentów
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {documentId ? (
            <>
              <label className="block min-w-0">
                <span className="mb-1 block text-xs edunga-text-muted">
                  Tytuł dokumentu
                </span>
                <input
                  type="text"
                  value={document.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Np. Sprawdzian — Zbiory"
                  className="edunga-input w-full rounded-lg px-3 py-2 text-sm outline-none"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs edunga-text-muted">Typ</span>
                  <select
                    value={document.type}
                    onChange={(e) =>
                      onTypeChange(e.target.value as DocumentType)
                    }
                    className="edunga-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs edunga-text-muted">Klasa</span>
                  <select
                    value={metadata?.klasa ?? "3-lo"}
                    onChange={(e) =>
                      onMetadataChange?.({
                        klasa: e.target.value as DocumentClass,
                      })
                    }
                    className="edunga-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {DOCUMENT_CLASS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs edunga-text-muted">
                    Poziom
                  </span>
                  <select
                    value={metadata?.poziom ?? "pp"}
                    onChange={(e) =>
                      onMetadataChange?.({
                        poziom: e.target.value as DocumentLevel,
                      })
                    }
                    className="edunga-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {DOCUMENT_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs edunga-text-muted">Opis</span>
                <textarea
                  value={metadata?.opis ?? ""}
                  onChange={(e) =>
                    onMetadataChange?.({ opis: e.target.value })
                  }
                  placeholder="Opcjonalny opis…"
                  rows={2}
                  className="edunga-input w-full rounded-lg px-3 py-2 text-sm outline-none"
                />
              </label>
            </>
          ) : (
            <p className="edunga-input edunga-input--muted rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm edunga-text-muted">
              Tytuł, typ, klasa i poziom ustawisz w oknie zapisu.
            </p>
          )}
        </div>

        <CollapsibleSection
          title="Układ wydruku"
          summary={printLayoutSummaryText}
          defaultOpen={false}
          contentClassName="edunga-input edunga-input--muted rounded-xl p-3 text-sm edunga-text-body"
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs edunga-text-muted">
                Układ kartki
              </span>
              <select
                value={normalizedPrintLayout.grid}
                onChange={(event) => {
                  const grid = event.target.value as PrintLayoutOptions["grid"];
                  const subtaskPerCell = isSubtaskPerCellLayout(grid);
                  const subtaskGrid = isSubtaskGridLayout(grid);

                  onPrintLayoutChange({
                    grid,
                    duplex:
                      subtaskPerCell || subtaskGrid
                        ? false
                        : normalizedPrintLayout.duplex,
                    splitAfterTask:
                      normalizedPrintLayout.duplex || grid !== "1x1"
                        ? defaultSplitAfterTask(taskCount)
                        : normalizedPrintLayout.splitAfterTask,
                  });
                }}
                className="edunga-input w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
              >
                {PRINT_GRID_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm edunga-text-body">
              <input
                type="checkbox"
                checked={normalizedPrintLayout.duplex}
                disabled={
                  isSubtaskPerCellLayout(normalizedPrintLayout.grid) ||
                  isSubtaskGridLayout(normalizedPrintLayout.grid)
                }
                onChange={(event) =>
                  onPrintLayoutChange({
                    duplex: event.target.checked,
                    splitAfterTask: event.target.checked
                      ? defaultSplitAfterTask(taskCount)
                      : normalizedPrintLayout.splitAfterTask,
                  })
                }
                className="h-3.5 w-3.5 accent-yellow-400 disabled:opacity-40"
              />
              Układ do druku dwustronnego
            </label>

            {isSubtaskPerCellLayout(normalizedPrintLayout.grid) ? (
              <p className="text-xs edunga-text-muted">
                Każdy podpunkt trafia na osobną kartę 2×2. Wspólna treść zadania
                powtarza się automatycznie w każdej komórce.
              </p>
            ) : null}

            {isSubtaskGridLayout(normalizedPrintLayout.grid) ? (
              <p className="text-xs edunga-text-muted">
                Treść zadania raz u góry, podpunkty w dwóch kolumnach (a i b, c
                i d…) z miejscem na rozwiązanie pod każdym podpunktem.
              </p>
            ) : null}

            {normalizedPrintLayout.duplex && taskCount > 0 ? (
              <label className="block">
                <span className="mb-1 block text-xs edunga-text-muted">
                  Podział po zadaniu
                </span>
                <select
                  value={normalizedPrintLayout.splitAfterTask}
                  onChange={(event) =>
                    onPrintLayoutChange({
                      splitAfterTask: Number(event.target.value),
                    })
                  }
                  className="edunga-input w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
                >
                  {Array.from({ length: taskCount }, (_, index) => index + 1).map(
                    (taskNumber) => (
                      <option key={taskNumber} value={taskNumber}>
                        {taskNumber}
                      </option>
                    )
                  )}
                </select>
                <p className="mt-2 text-xs edunga-text-muted">
                  Przód: zadania 1–{normalizedPrintLayout.splitAfterTask}. Tył:
                  pozostałe zadania. Pozycje quizów na stronie tylnej odpowiadają
                  dokładnie pozycjom z przodu.
                </p>
              </label>
            ) : null}

            <div className="space-y-2 edunga-divider border-t pt-3">
              <p className="text-xs edunga-text-muted">Linie cięcia</p>

              <label className="flex items-center gap-2 text-sm edunga-text-body">
                <input
                  type="checkbox"
                  checked={normalizedPrintLayout.showCutLines}
                  onChange={(event) =>
                    onPrintLayoutChange({ showCutLines: event.target.checked })
                  }
                  className="h-3.5 w-3.5 accent-yellow-400"
                />
                Pokaż linie cięcia
              </label>

              <label className="flex items-center gap-2 text-sm edunga-text-body">
                <input
                  type="checkbox"
                  checked={normalizedPrintLayout.showCropMarks}
                  onChange={(event) =>
                    onPrintLayoutChange({ showCropMarks: event.target.checked })
                  }
                  className="h-3.5 w-3.5 accent-yellow-400"
                />
                Pokaż znaczniki cięcia
              </label>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Metadane"
          summary={metadataSummary}
          defaultOpen={false}
          contentClassName="edunga-input edunga-input--muted rounded-xl p-3 text-sm edunga-text-body"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs edunga-text-muted">Data</span>
                <input
                  type="text"
                  value={display.date}
                  onChange={(e) => onDisplayChange({ date: e.target.value })}
                  placeholder="Np. 07.09.2026"
                  className="edunga-input w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs edunga-text-muted">Klasa</span>
                <input
                  type="text"
                  value={display.className}
                  onChange={(e) =>
                    onDisplayChange({ className: e.target.value })
                  }
                  placeholder="Np. 1A"
                  className="edunga-input w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
                />
              </label>
            </div>

            <div className="block">
              <span className="mb-1.5 block text-xs edunga-text-muted">Grupa</span>
              <div className="flex flex-wrap gap-3">
                {GROUP_OPTIONS.slice(0, 3).map((group) => (
                  <label
                    key={group}
                    className="flex items-center gap-1.5 text-sm edunga-text-body"
                  >
                    <input
                      type="checkbox"
                      checked={display.selectedGroups.includes(group)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? sortSelectedGroups([
                              ...display.selectedGroups,
                              group,
                            ])
                          : display.selectedGroups.filter(
                              (value) => value !== group
                            );
                        onDisplayChange({ selectedGroups: next });
                      }}
                      className="h-3.5 w-3.5 accent-yellow-400"
                    />
                    {group}
                  </label>
                ))}
              </div>
            </div>

            {display.showTotalPoints ? (
              <label className="block w-full max-w-[14rem]">
                <span className="mb-1 block text-xs edunga-text-muted">
                  Suma punktów
                </span>
                <input
                  type="text"
                  value={display.totalPoints}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    const cleared = nextValue.trim().length === 0;

                    onDisplayChange({
                      totalPoints: cleared ? autoTotalPoints : nextValue,
                      totalPointsCustomized: !cleared,
                    });
                  }}
                  className="edunga-input w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
                />
              </label>
            ) : (
              <p className="text-sm edunga-text-body">
                <span className="edunga-text-muted">ΣP:</span> {totals.punkty} pkt
              </p>
            )}

            <DocumentDisplayCheckboxGrid
              display={display}
              totals={totals}
              instructionsEditing={instructionsEditing}
              onInstructionsEditingChange={setInstructionsEditing}
              onDisplayChange={onDisplayChange}
            />
          </div>
        </CollapsibleSection>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium edunga-text-body">Elementy dokumentu</h3>
          <span className="text-xs edunga-text-muted">{itemsSummary}</span>
        </div>

        <label className="document-panel__renumber-option mb-2 flex shrink-0 items-center gap-2 text-sm edunga-text-body">
          <input
            type="checkbox"
            checked={display.renumberSelectedSubtasks}
            onChange={(event) =>
              onDisplayChange({
                renumberSelectedSubtasks: event.target.checked,
              })
            }
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Renumeruj wybrane podpunkty
        </label>

        <div
          ref={itemsScrollRef}
          className="document-panel__items min-h-0 flex-1"
        >
            {document.items.length === 0 ? (
              <p className="edunga-text-muted">
                Dodaj zadania z biblioteki po lewej stronie.
              </p>
            ) : (
              <ol className="space-y-3">
                {(() => {
                  let taskNumber = 0;

                  return document.items.map((item, index) => {
                    if (isDocumentAnswerAreaItem(item)) {
                      return (
                        <li key={item.entryId} data-entry-id={item.entryId}>
                          <DocumentAnswerAreaRow
                            index={index}
                            item={item}
                            itemCount={document.items.length}
                            selected={selectedEntryId === item.entryId}
                            onSelect={() => setSelectedEntryId(item.entryId)}
                            onMove={handleMove}
                            onRemove={onRemove}
                            onUpdate={onUpdateAnswerAreaItem}
                          />
                        </li>
                      );
                    }

                    taskNumber += 1;
                    const task = taskMap.get(item.taskId);
                    const variants = task ? normalizeVariants(task) : [];

                    return (
                      <li key={item.entryId} data-entry-id={item.entryId}>
                        <DocumentTaskRow
                          taskNumber={taskNumber}
                          index={index}
                          item={item}
                          task={task}
                          variants={variants}
                          itemCount={document.items.length}
                          selected={selectedEntryId === item.entryId}
                          onSelect={() => setSelectedEntryId(item.entryId)}
                          onMove={handleMove}
                          onRemove={onRemove}
                          onSetVariantIndex={onSetVariantIndex}
                          onSetSelectedSubtasks={onSetSelectedSubtasks}
                          renumberSelectedSubtasks={
                            document.display.renumberSelectedSubtasks
                          }
                        />
                      </li>
                    );
                  });
                })()}
              </ol>
            )}
          </div>
      </div>

      <footer className="document-panel__footer shrink-0 edunga-divider border-t pt-3">
        <div className="mb-3 text-sm edunga-text-body">
          <p>
            <span className="edunga-text-muted">Punkty:</span> {totals.punkty}
          </p>
          <p>
            <span className="edunga-text-muted">Szacowany czas:</span>{" "}
            {totals.czas} min
          </p>
        </div>

        <div className="grid gap-2">
          {saveMessage ? (
            <p
              role="status"
              className={
                saveMessage.type === "error"
                  ? "rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200"
                  : "rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
              }
            >
              {saveMessage.text}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !onSave || document.items.length === 0}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Zapisywanie..."
              : documentId
                ? isDirty
                  ? "💾 Zapisz zmiany"
                  : "💾 Zapisano"
                : "💾 Zapisz dokument"}
          </button>

          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting || document.items.length === 0}
            className="w-full rounded-xl bg-[#F7B500] px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Generowanie PDF..." : "📄 Eksportuj PDF"}
          </button>
        </div>
      </footer>
    </section>
  );
}

function formatItemCount(count: number): string {
  if (count === 1) {
    return "1 element";
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (
    mod10 >= 2 &&
    mod10 <= 4 &&
    (mod100 < 12 || mod100 > 14)
  ) {
    return `${count} elementy`;
  }

  return `${count} elementów`;
}

function DocumentDisplayCheckboxGrid({
  display,
  totals,
  instructionsEditing,
  onInstructionsEditingChange,
  onDisplayChange,
}: {
  display: DocumentDisplayOptions;
  totals: { punkty: number };
  instructionsEditing: boolean;
  onInstructionsEditingChange: (editing: boolean) => void;
  onDisplayChange: (patch: Partial<DocumentDisplayOptions>) => void;
}) {
  return (
    <div className="pt-1">
      <div className="document-panel__display-grid">
        <label>
          <input
            type="checkbox"
            checked={display.showTitle}
            onChange={(e) => onDisplayChange({ showTitle: e.target.checked })}
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Tytuł
        </label>

        <label>
          <input
            type="checkbox"
            checked={display.showDate}
            onChange={(e) => onDisplayChange({ showDate: e.target.checked })}
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Data
        </label>

        <label>
          <input
            type="checkbox"
            checked={display.showStudentName}
            onChange={(e) =>
              onDisplayChange({ showStudentName: e.target.checked })
            }
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Imię i nazwisko
        </label>

        <label>
          <input
            type="checkbox"
            checked={display.showClass}
            onChange={(e) => onDisplayChange({ showClass: e.target.checked })}
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Klasa
        </label>

        <label>
          <input
            type="checkbox"
            checked={display.showGroup}
            onChange={(e) => onDisplayChange({ showGroup: e.target.checked })}
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Grupa
        </label>

        <label>
          <input
            type="checkbox"
            checked={display.showTotalPoints}
            onChange={(e) => {
              const checked = e.target.checked;
              const patch: Partial<DocumentDisplayOptions> = {
                showTotalPoints: checked,
              };

              if (checked && !display.totalPointsCustomized) {
                patch.totalPoints = `___ / ${totals.punkty}`;
              }

              onDisplayChange(patch);
            }}
            className="h-3.5 w-3.5 accent-yellow-400"
          />
          Suma punktów
        </label>

        <div className="document-panel__instructions-control">
          <label>
            <input
              type="checkbox"
              checked={display.showStudentInstructions}
              onChange={(e) => {
                const checked = e.target.checked;
                const patch: Partial<DocumentDisplayOptions> = {
                  showStudentInstructions: checked,
                };

                if (checked && !display.studentInstructions.trim()) {
                  patch.studentInstructions = DEFAULT_STUDENT_INSTRUCTIONS;
                }

                onDisplayChange(patch);

                if (!checked) {
                  onInstructionsEditingChange(false);
                }
              }}
              className="h-3.5 w-3.5 accent-yellow-400"
            />
            Instrukcje dla ucznia
          </label>

          <button
            type="button"
            onClick={() => onInstructionsEditingChange(!instructionsEditing)}
            className="edunga-btn-secondary rounded-md px-2 py-0.5 text-xs transition hover:bg-slate-200"
          >
            {instructionsEditing ? "Zamknij" : "Edytuj"}
          </button>
        </div>
      </div>

      {instructionsEditing ? (
        <label className="mt-2 block">
          <textarea
            value={display.studentInstructions}
            onChange={(e) =>
              onDisplayChange({
                studentInstructions: e.target.value,
              })
            }
            rows={3}
            className="edunga-input w-full rounded-lg px-2.5 py-2 text-sm outline-none"
          />
        </label>
      ) : null}
    </div>
  );
}

function DocumentTaskRow({
  taskNumber,
  index,
  item,
  task,
  variants,
  itemCount,
  selected,
  onSelect,
  onMove,
  onRemove,
  onSetVariantIndex,
  onSetSelectedSubtasks,
  renumberSelectedSubtasks,
}: {
  taskNumber: number;
  index: number;
  item: Extract<GeneratorDocument["items"][number], { kind: "task" }>;
  task: GeneratorTask | undefined;
  variants: ReturnType<typeof normalizeVariants>;
  itemCount: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (entryId: string, direction: -1 | 1) => void;
  onRemove: (entryId: string) => void;
  onSetVariantIndex: (entryId: string, variantIndex: number) => void;
  onSetSelectedSubtasks: (
    entryId: string,
    selectedSubtasks?: string[]
  ) => void;
  renumberSelectedSubtasks: boolean;
}) {
  const currentVariant =
    variants[item.variantIndex] ?? variants[0];
  const subtasks = task ? detectSubtasks(currentVariant?.tresc) : [];
  const selectedSubtasks = effectiveSelectedSubtasks(
    item.selectedSubtasks,
    subtasks
  );
  const content = task
    ? taskVariantContent(
        task,
        item.variantIndex,
        item.selectedSubtasks,
        renumberSelectedSubtasks
      )
    : null;

  return (
    <article
      onClick={onSelect}
      className={`edunga-input rounded-xl border p-3 transition ${
        selected
          ? "border-[var(--edunga-yellow)] bg-[rgb(247_181_0/0.08)] ring-1 ring-[rgb(247_181_0/0.25)]"
          : "border-[var(--edunga-border)]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium edunga-text-body">
            {formatTaskNumber(taskNumber)}.
          </span>

          {task ? (
            <span className="font-mono text-xs font-semibold text-yellow-300">
              {task.kod}
            </span>
          ) : null}

          {task && variants.length > 1 ? (
            <VariantTabs
              count={variants.length}
              activeIndex={item.variantIndex}
              onSelect={(variantIndex) =>
                onSetVariantIndex(item.entryId, variantIndex)
              }
            />
          ) : null}
        </div>

        <ItemMoveControls
          entryId={item.entryId}
          index={index}
          itemCount={itemCount}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>

      {subtasks.length > 0 ? (
        <SubtaskCheckboxPicker
          subtasks={subtasks}
          selected={selectedSubtasks}
          compact
          onChange={(next) =>
            onSetSelectedSubtasks(
              item.entryId,
              normalizeSubtaskSelectionForStorage(subtasks, next)
            )
          }
        />
      ) : null}

      <div className="document-panel__task-preview">
        {content ? (
          <DocumentViewer
            key={`${item.entryId}-${item.variantIndex}`}
            value={content}
            preview
          />
        ) : (
          <p className="document-panel__task-preview-empty">
            Nie znaleziono treści zadania.
          </p>
        )}
      </div>
    </article>
  );
}

function DocumentAnswerAreaRow({
  index,
  item,
  itemCount,
  selected,
  onSelect,
  onMove,
  onRemove,
  onUpdate,
}: {
  index: number;
  item: DocumentAnswerAreaItem;
  itemCount: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (entryId: string, direction: -1 | 1) => void;
  onRemove: (entryId: string) => void;
  onUpdate: (
    entryId: string,
    patch: Partial<Pick<DocumentAnswerAreaItem, "areaType" | "heightCm" | "heightPx">>
  ) => void;
}) {
  return (
    <article
      onClick={onSelect}
      className={`edunga-input rounded-xl border p-3 transition ${
        selected
          ? "border-[var(--edunga-yellow)] bg-[rgb(247_181_0/0.08)] ring-1 ring-[rgb(247_181_0/0.25)]"
          : "border-[var(--edunga-border)]"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium edunga-text-body">
          Pole na rozwiązanie
        </span>

        <ItemMoveControls
          entryId={item.entryId}
          index={index}
          itemCount={itemCount}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>

      <div className="mb-2">
        <AnswerAreaTypePicker
          value={item.areaType}
          onChange={(areaType) => onUpdate(item.entryId, { areaType })}
        />
      </div>

      <AnswerAreaBoxFromItem
        item={item}
        resizable
        onResize={(heightPx) =>
          onUpdate(item.entryId, patchAnswerAreaHeight(heightPx))
        }
        className="document-preview-answer-area--editor"
      />
    </article>
  );
}

function ItemMoveControls({
  entryId,
  index,
  itemCount,
  onMove,
  onRemove,
}: {
  entryId: string;
  index: number;
  itemCount: number;
  onMove: (entryId: string, direction: -1 | 1) => void;
  onRemove: (entryId: string) => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMove(entryId, -1);
        }}
        disabled={index === 0}
        className="edunga-btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-40"
        title="Przesuń w górę"
      >
        ↑
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMove(entryId, 1);
        }}
        disabled={index === itemCount - 1}
        className="edunga-btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-40"
        title="Przesuń w dół"
      >
        ↓
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(entryId);
        }}
        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
        title="Usuń"
      >
        ✕
      </button>
    </div>
  );
}
