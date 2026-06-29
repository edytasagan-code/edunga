"use client";

import { useId } from "react";
import EditorToolbar from "./EditorToolbar";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  variant?: "full" | "compact";
  rows?: number;
};

export default function MathEditor({
  label,
  placeholder,
  value,
  onChange,
  variant = "full",
  rows = 12,
}: Props) {
  const id = useId();

  function insert(text: string) {
    const textarea = document.getElementById(id) as HTMLTextAreaElement | null;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue =
      value.substring(0, start) +
      text +
      value.substring(end);

    onChange(newValue);

    requestAnimationFrame(() => {
      textarea.focus();

      const pos = start + text.length;

      textarea.setSelectionRange(pos, pos);
    });
  }

  return (
    <div>
      <label className="mb-2 block text-lg font-semibold text-white">
        {label}
      </label>

      <EditorToolbar
        variant={variant}
        onInsert={insert}
      />

      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-lg text-white outline-none"
      />
    </div>
  );
}