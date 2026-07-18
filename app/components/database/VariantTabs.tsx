"use client";

import {
  MAX_VARIANTS,
  variantLabel,
} from "@/app/lib/variants";

type Props = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd?: () => void;
  tone?: "dark" | "light";
};

function tabClass(active: boolean, tone: "dark" | "light") {
  if (tone === "light") {
    return active
      ? "rounded bg-[var(--edunga-yellow)] px-2 py-0.5 text-xs font-medium text-black"
      : "rounded edunga-btn-secondary px-2 py-0.5 text-xs edunga-text-body hover:bg-slate-200";
  }

  return active
    ? "rounded bg-[var(--edunga-yellow)] px-2 py-1 text-sm font-medium text-black"
    : "rounded edunga-btn-secondary px-2 py-1 text-sm edunga-text-body hover:bg-slate-200";
}

export default function VariantTabs({
  count,
  activeIndex,
  onSelect,
  onAdd,
  tone = "light",
}: Props) {
  if (count <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={variantLabel(index)}
          type="button"
          className={tabClass(index === activeIndex, tone)}
          onClick={() => onSelect(index)}
        >
          [{variantLabel(index)}]
        </button>
      ))}

      {onAdd && count < MAX_VARIANTS && (
        <button
          type="button"
          className="rounded edunga-btn-secondary px-2 py-1 text-sm edunga-text-body hover:bg-slate-200"
          onClick={onAdd}
        >
          [+]
        </button>
      )}
    </div>
  );
}
