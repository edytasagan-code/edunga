"use client";

import { useState } from "react";

import VariantTabs from "@/app/components/database/VariantTabs";
import DocumentViewer, {
  hasDocumentContent,
} from "@/app/components/document-viewer";
import {
  normalizeTaskIdentifier,
  taskSourceLabel,
} from "@/app/lib/taskSource";
import { detectSubtasks } from "@/app/lib/subtaskSelection";
import { normalizeVariants } from "@/app/lib/variants";

import type { GeneratorTask } from "./DocumentGenerator";
import SubtaskCheckboxPicker, {
  useSubtaskSelectionState,
} from "./SubtaskCheckboxPicker";

import "./task-library.css";

type Props = {
  task: GeneratorTask;
  onAdd: (
    taskId: string,
    variantIndex: number,
    selectedSubtasks?: string[]
  ) => void;
  isAdded: boolean;
};

function difficultyStars(poziom: number): string {
  const level = Math.min(5, Math.max(0, poziom));

  if (level === 0) {
    return "—";
  }

  return "★".repeat(level) + "☆".repeat(5 - level);
}

export default function TaskLibraryCard({
  task,
  onAdd,
  isAdded,
}: Props) {
  const variants = normalizeVariants(task);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const currentVariant =
    variants[activeVariantIndex] ?? variants[0];
  const subtasks = detectSubtasks(currentVariant.tresc);
  const {
    selected: selectedSubtasks,
    setSelected: setSelectedSubtasks,
    storageValue: selectedSubtasksForStorage,
    canAdd,
  } = useSubtaskSelectionState(subtasks);
  const identifier =
    normalizeTaskIdentifier(task.identyfikator) || "—";
  const showAnswer = hasDocumentContent(currentVariant.odpowiedz);
  const showContent = hasDocumentContent(currentVariant.tresc);

  return (
    <article className="task-library-card">
      <div className="task-library-card__header">
        <h3 className="task-library-card__code">{task.kod}</h3>

        <button
          type="button"
          onClick={() =>
            onAdd(task.id, activeVariantIndex, selectedSubtasksForStorage)
          }
          disabled={isAdded || !canAdd}
          className="task-library-card__add"
        >
          {isAdded ? "✓ Dodane" : "+ Dodaj"}
        </button>
      </div>

      {subtasks.length > 0 ? (
        <SubtaskCheckboxPicker
          subtasks={subtasks}
          selected={selectedSubtasks}
          onChange={setSelectedSubtasks}
          disabled={isAdded}
        />
      ) : null}

      <div className="task-library-card__meta">
        <span className="task-library-card__meta-item">
          Źródło: <strong>{taskSourceLabel(task.zrodlo)}</strong>
        </span>
        <span className="task-library-card__meta-item">
          Identyfikator: <strong>{identifier}</strong>
        </span>
        <span
          className="task-library-card__meta-item task-library-card__difficulty"
          aria-label={`Trudność ${task.poziom} z 5`}
        >
          {difficultyStars(task.poziom)}
        </span>
        {task.punkty > 0 && (
          <span className="task-library-card__meta-item">
            {task.punkty} pkt
          </span>
        )}
        {task.czas > 0 && (
          <span className="task-library-card__meta-item">
            {task.czas} min
          </span>
        )}
      </div>

      {variants.length > 1 && (
        <div className="task-library-card__variants">
          <VariantTabs
            count={variants.length}
            activeIndex={activeVariantIndex}
            onSelect={setActiveVariantIndex}
          />
        </div>
      )}

      {showContent ? (
        <div className="task-library-card__preview task-library-card__preview--full">
          <DocumentViewer
            key={`${task.id}-${activeVariantIndex}-tresc`}
            value={currentVariant.tresc}
            preview
          />
        </div>
      ) : (
        <p className="task-library-card__empty">Brak treści</p>
      )}

      <div className="task-library-card__section">
        <p className="task-library-card__section-label">Odpowiedź</p>
        {showAnswer ? (
          <div className="task-library-card__preview task-library-card__preview--answer">
            <DocumentViewer
              key={`${task.id}-${activeVariantIndex}-odpowiedz`}
              value={currentVariant.odpowiedz}
              preview
              compact
            />
          </div>
        ) : (
          <p className="task-library-card__empty">Brak odpowiedzi</p>
        )}
      </div>
    </article>
  );
}
