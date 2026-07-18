"use client";

import { useEffect, useState } from "react";

import {
  effectiveSelectedSubtasks,
  normalizeSubtaskSelectionForStorage,
} from "@/app/lib/subtaskSelection";

import "./subtask-picker.css";

type Props = {
  subtasks: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  compact?: boolean;
  disabled?: boolean;
};

export default function SubtaskCheckboxPicker({
  subtasks,
  selected,
  onChange,
  compact = false,
  disabled = false,
}: Props) {
  if (subtasks.length === 0) {
    return null;
  }

  function toggle(label: string, checked: boolean) {
    const next = checked
      ? [...selected, label].sort()
      : selected.filter((value) => value !== label);

    if (next.length === 0) {
      return;
    }

    onChange(next);
  }

  return (
    <div
      className={`subtask-picker${compact ? " subtask-picker--compact" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="subtask-picker__label">Podpunkty:</span>
      <div className="subtask-picker__options">
        {subtasks.map((label) => (
          <label key={label} className="subtask-picker__option">
            <input
              type="checkbox"
              checked={selected.includes(label)}
              disabled={disabled}
              onChange={(event) => toggle(label, event.target.checked)}
              className="subtask-picker__checkbox"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function useSubtaskSelectionState(subtasks: string[]) {
  const [selected, setSelected] = useState(subtasks);

  useEffect(() => {
    setSelected(subtasks);
  }, [subtasks.join(",")]);

  const effectiveSelected = effectiveSelectedSubtasks(selected, subtasks);
  const storageValue = normalizeSubtaskSelectionForStorage(
    subtasks,
    effectiveSelected
  );

  return {
    selected: effectiveSelected,
    setSelected,
    storageValue,
    canAdd: subtasks.length === 0 || effectiveSelected.length > 0,
  };
}
