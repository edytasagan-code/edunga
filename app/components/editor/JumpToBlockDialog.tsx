"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { buildDocumentOutline } from "./documentOutline";
import type { EditorDocument } from "./types";

type Props = {
  document: EditorDocument;
  open: boolean;
  onClose: () => void;
  onSelect: (paragraphId: string) => void;
};

export default function JumpToBlockDialog({
  document,
  open,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => buildDocumentOutline(document), [document]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.index + 1} ${item.preview} ${item.subtaskLabel ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setActiveIndex(0);

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) =>
          Math.min(current + 1, Math.max(filtered.length - 1, 0))
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        onSelect(filtered[activeIndex].id);
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeIndex, filtered, onClose, onSelect, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="edunga-jump-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="edunga-jump-dialog" role="dialog" aria-label="Przejdź do bloku">
        <div className="edunga-jump-dialog__header">
          Przejdź do bloku (Ctrl+G)
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          placeholder="Szukaj po numerze lub treści…"
          className="edunga-jump-dialog__search"
        />
        <div className="edunga-jump-dialog__list">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`edunga-jump-dialog__item${
                index === activeIndex ? " is-active" : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
            >
              {item.index + 1}. {item.preview}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
