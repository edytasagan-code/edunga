"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { measureTextOffset } from "../selection";
import {
  isCaretOnFirstLine,
  isCaretOnLastLine,
} from "../caretGeometry";
import { readEditorCaretRestoreHint } from "../selectionModel";

export type TextNavigationHandlers = {
  arrowLeft: (offset: number) => boolean;
  arrowRight: (
    offset: number,
    textLength: number
  ) => boolean;
  arrowUp: (offset: number) => boolean;
  arrowDown: (
    offset: number,
    textLength: number
  ) => boolean;
  backspace: (offset: number) => boolean;
  delete: (
    offset: number,
    textLength: number
  ) => boolean;
};

type Props = {
  paragraphId: string;
  id: string;
  text: string;
  followsMath?: boolean;
  selected?: boolean;
  onChange: (text: string) => void;
  onCursorChange?: (
    paragraphId: string,
    nodeId: string,
    offset: number
  ) => void;
  onFocus?: (id: string) => void;
  onBlur?: (id: string) => void;
  navigation: TextNavigationHandlers;
  onSelectAll?: () => void;
  onMoveToPreviousParagraph?: () => boolean;
  onMoveToNextParagraph?: () => boolean;
};

function getCaretOffset(element: HTMLElement): number {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);

  if (!element.contains(range.startContainer)) {
    return 0;
  }

  return measureTextOffset(element, range);
}

function isModifiedKey(event: React.KeyboardEvent): boolean {
  return (
    event.ctrlKey || event.metaKey || event.altKey
  );
}

export default function TextNode({
  paragraphId,
  id,
  text,
  followsMath = false,
  selected = false,
  onChange,
  onCursorChange,
  onFocus,
  onBlur,
  navigation,
  onSelectAll,
  onMoveToPreviousParagraph,
  onMoveToNextParagraph,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const initialized = useRef(false);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    if (!initialized.current) {
      element.textContent = text;
      initialized.current = true;
    }
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const domText = element.textContent ?? "";

    if (domText === text) {
      return;
    }

    const selection = window.getSelection();
    const restoreHint = readEditorCaretRestoreHint(element);
    const shouldRestoreFromHint =
      restoreHint?.nodeId === id;
    const hadFocus =
      Boolean(selection?.anchorNode) &&
      element.contains(selection!.anchorNode!);

    const offset = shouldRestoreFromHint
      ? restoreHint.offset
      : hadFocus
        ? getCaretOffset(element)
        : 0;

    element.textContent = text;

    if (!selection) {
      return;
    }

    if (!hadFocus && !shouldRestoreFromHint) {
      return;
    }

    if (shouldRestoreFromHint) {
      element.focus();
    }

    const textChild = element.firstChild;

    if (textChild?.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const nextOffset = Math.max(
      0,
      Math.min(offset, text.length)
    );
    const range = document.createRange();
    range.setStart(textChild, nextOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [text]);

  function updateCursor() {
    const span = ref.current;

    if (!span) {
      return;
    }

    onCursorChange?.(
      paragraphId,
      id,
      getCaretOffset(span)
    );
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLSpanElement>
  ) {
    const span = ref.current;

    if (!span) {
      return;
    }

    const selection = window.getSelection();

    if (
      selection &&
      !selection.isCollapsed &&
      selection.rangeCount > 0
    ) {
      const range = selection.getRangeAt(0);

      if (
        span.contains(range.startContainer) &&
        span.contains(range.endContainer)
      ) {
        return;
      }
    }

    const offset = getCaretOffset(span);
    const length = span.textContent?.length ?? 0;

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      event.stopPropagation();
      onSelectAll?.();
      return;
    }

    if (isModifiedKey(event)) {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      navigation.arrowLeft(offset)
    ) {
      event.preventDefault();
      return;
    }

    if (
      event.key === "ArrowRight" &&
      navigation.arrowRight(offset, length)
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp" && isCaretOnFirstLine(span)) {
      if (navigation.arrowUp(offset)) {
        event.preventDefault();
        return;
      }

      if (onMoveToPreviousParagraph?.()) {
        event.preventDefault();
      }

      return;
    }

    if (event.key === "ArrowDown" && isCaretOnLastLine(span)) {
      if (navigation.arrowDown(offset, length)) {
        event.preventDefault();
        return;
      }

      if (onMoveToNextParagraph?.()) {
        event.preventDefault();
      }

      return;
    }

    if (
      event.key === "Backspace" &&
      navigation.backspace(offset)
    ) {
      event.preventDefault();
      return;
    }

    if (
      event.key === "Delete" &&
      navigation.delete(offset, length)
    ) {
      event.preventDefault();
    }
  }

  return (
    <span
      ref={ref}
      data-node-id={id}
      data-node-type="text"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      dir="ltr"
      onFocus={() => {
        onFocus?.(id);
        updateCursor();
      }}
      onBlur={() => {
        if (isUnmountingRef.current) {
          onBlur?.(id);
          return;
        }

        onChange(ref.current?.textContent ?? "");
        onBlur?.(id);
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={updateCursor}
      onMouseUp={updateCursor}
      onInput={(e) => {
        onChange(
          e.currentTarget.textContent ?? ""
        );

        updateCursor();
      }}
      className={`
        align-baseline
        min-w-[1px]
        outline-none
        whitespace-pre-wrap
        break-words
        text-inherit
        ${text.length === 0 ? "inline-block" : "inline"}
        ${text.length === 0 ? (followsMath ? "min-w-[1.5ch]" : "min-w-[1ch]") : ""}
        ${selected ? "is-selected" : ""}
      `}
    />
  );
}
