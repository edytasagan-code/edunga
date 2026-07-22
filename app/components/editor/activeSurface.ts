import {
  handleEditorSelectAllShortcut,
  ensureEditorSessionHandlers,
} from "./editorSession";
import {
  resolveFocusedEditorSurface,
  selectAllEditorContent,
} from "./selection";
import type { MathTemplateKey } from "./mathTemplates";

export type EditorShortcutTarget = {
  surface: HTMLElement;
  onInsertMath: () => Promise<string | null>;
  onInsertMathTemplate?: (
    template: MathTemplateKey
  ) => Promise<void>;
};

let lastActiveSurface: HTMLElement | null = null;
let lastInsertMath: EditorShortcutTarget["onInsertMath"] | null =
  null;
let lastInsertMathTemplate:
  | EditorShortcutTarget["onInsertMathTemplate"]
  | null = null;
let handlerInstalled = false;

export function setActiveEditorSurface(
  surface: HTMLElement | null
) {
  if (surface?.isConnected) {
    lastActiveSurface = surface;
  }
}

export function setActiveEditorShortcutTarget(
  target: EditorShortcutTarget | null
) {
  if (!target?.surface.isConnected) {
    return;
  }

  lastActiveSurface = target.surface;
  lastInsertMath = target.onInsertMath;
  lastInsertMathTemplate = target.onInsertMathTemplate ?? null;
}

function isNativeTextInput(
  element: Element | null
): boolean {
  if (!element) {
    return false;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  return (
    element instanceof HTMLElement &&
    element.isContentEditable &&
    !element.closest(".edunga-editor-surface")
  );
}

export function resolveEditorSurfaceForShortcut(): HTMLElement | null {
  const focused = resolveFocusedEditorSurface();

  if (focused) {
    lastActiveSurface = focused;
    return focused;
  }

  const active = window.document.activeElement;

  if (isNativeTextInput(active)) {
    return null;
  }

  const selection = window.getSelection();

  if (
    selection &&
    selection.rangeCount > 0 &&
    lastActiveSurface?.isConnected
  ) {
    const range = selection.getRangeAt(0);

    if (
      lastActiveSurface.contains(range.startContainer) ||
      lastActiveSurface.contains(range.endContainer)
    ) {
      return lastActiveSurface;
    }
  }

  if (lastActiveSurface?.isConnected) {
    return lastActiveSurface;
  }

  lastActiveSurface = null;
  return null;
}

function runInsertMathShortcut(): boolean {
  if (!resolveEditorSurfaceForShortcut()) {
    return false;
  }

  if (!lastInsertMath) {
    return false;
  }

  void lastInsertMath();
  return true;
}

function runInsertMathTemplateShortcut(
  template: MathTemplateKey
): boolean {
  if (!resolveEditorSurfaceForShortcut()) {
    return false;
  }

  if (!lastInsertMathTemplate) {
    return false;
  }

  void lastInsertMathTemplate(template);
  return true;
}

export function ensureEditorShortcutHandlers() {
  if (handlerInstalled || typeof window === "undefined") {
    return;
  }

  handlerInstalled = true;
  ensureEditorSessionHandlers();

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "a") {
          if (!handleEditorSelectAllShortcut()) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
        }

        return;
      }

      if (event.altKey && !event.shiftKey) {
        const key = event.key.toLowerCase();

        if (key === "f") {
          if (!runInsertMathShortcut()) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === "2") {
          if (!runInsertMathTemplateShortcut("superscript")) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === "3") {
          if (!runInsertMathTemplateShortcut("superscript3")) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    },
    true
  );
}

/** @deprecated Use ensureEditorShortcutHandlers */
export function ensureEditorSelectAllHandler() {
  ensureEditorShortcutHandlers();
}

export function selectAllInEditorSurface(
  surface: HTMLElement
): boolean {
  setActiveEditorSurface(surface);
  return selectAllEditorContent(surface);
}
