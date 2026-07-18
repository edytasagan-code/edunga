"use client";

import {
  ANSWER_AREA_ITEM_TYPE_OPTIONS,
  type AnswerAreaItemType,
} from "@/app/lib/documentGenerator";

const TYPE_ICONS: Record<AnswerAreaItemType, string> = {
  blank: "⬜",
  lines: "☰",
  grid: "▦",
};

type Props = {
  value: AnswerAreaItemType;
  onChange: (value: AnswerAreaItemType) => void;
};

export default function AnswerAreaTypePicker({ value, onChange }: Props) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      {ANSWER_AREA_ITEM_TYPE_OPTIONS.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-base transition ${
              active
                ? "border-yellow-400/70 bg-yellow-400/15 text-yellow-300"
                : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700"
            }`}
          >
            {TYPE_ICONS[option.value]}
          </button>
        );
      })}
    </div>
  );
}
