"use client";

import { useEffect, useRef } from "react";

type Props = {
  paragraphId: string;
  id: string;
  text: string;
  selected?: boolean;
  onChange: (text: string) => void;
  onCursorChange?: (
    paragraphId: string,
    nodeId: string,
    offset: number
  ) => void;
  onFocus?: (id: string) => void;
  onBlur?: (id: string) => void;
};

export default function TextNode({
  paragraphId,
  id,
  text,
  selected = false,
  onChange,
  onCursorChange,
  onFocus,
  onBlur,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    // ustawiamy tekst tylko raz przy montowaniu
    if (!initialized.current) {
      element.textContent = text;
      initialized.current = true;
    }
  }, []);

  function updateCursor() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    onCursorChange?.(
      paragraphId,
      id,
      range.startOffset
    );
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      dir="ltr"
      onFocus={() => {
        onFocus?.(id);
        updateCursor();
      }}
      onBlur={() => onBlur?.(id)}
      onKeyUp={updateCursor}
      onMouseUp={updateCursor}
      onInput={(e) => {
        onChange(
          e.currentTarget.textContent ?? ""
        );

        updateCursor();
      }}
      className={`
        inline-block
        min-w-[2px]
        min-h-[28px]
        outline-none
        whitespace-pre-wrap
        break-words
        text-left
        text-lg
        text-white
        ${
          selected
            ? "rounded bg-yellow-400/20"
            : ""
        }
      `}
    />
  );
}