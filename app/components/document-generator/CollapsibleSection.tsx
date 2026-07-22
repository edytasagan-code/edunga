"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  children,
  className = "",
  contentClassName = "",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full shrink-0 items-center gap-2 rounded-lg py-1.5 text-left text-sm text-zinc-300 transition hover:text-white"
      >
        <span aria-hidden className="w-4 shrink-0 text-zinc-500">
          {open ? "▼" : "▶"}
        </span>
        <span className="font-medium">{title}</span>
        {!open && summary ? (
          <span className="ml-auto truncate text-xs text-zinc-500">{summary}</span>
        ) : null}
      </button>

      {open && children ? (
        <div id={contentId} className={`mt-2 ${contentClassName}`.trim()}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
