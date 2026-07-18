import type { CursorPosition } from "./cursor";
import { EditorDocument } from "../types";
import { cloneDocument } from "./document";

const MAX_HISTORY = 100;

type HistoryEntry = {
  document: EditorDocument;
  cursor: CursorPosition | null;
};

function documentsEqual(
  left: EditorDocument,
  right: EditorDocument
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneCursor(
  cursor: CursorPosition | null
): CursorPosition | null {
  if (!cursor) {
    return null;
  }

  return {
    paragraphId: cursor.paragraphId,
    nodeId: cursor.nodeId,
    offset: cursor.offset,
  };
}

export type HistoryStep = {
  document: EditorDocument;
  cursor: CursorPosition | null;
};

export default class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  /**
   * Zapisuje aktualny stan dokumentu.
   * Wywoływać przed każdą zmianą.
   */
  push(
    document: EditorDocument,
    cursor: CursorPosition | null = null
  ): void {
    const cloned = cloneDocument(document);
    const previous =
      this.undoStack[this.undoStack.length - 1];

    if (previous && documentsEqual(previous.document, cloned)) {
      return;
    }

    this.undoStack.push({
      document: cloned,
      cursor: cloneCursor(cursor),
    });

    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  /**
   * Cofnięcie zmian.
   */
  undo(
    current: EditorDocument,
    currentCursor: CursorPosition | null
  ): HistoryStep | null {
    const previous = this.undoStack.pop();

    if (!previous) {
      return null;
    }

    this.redoStack.push({
      document: cloneDocument(current),
      cursor: cloneCursor(currentCursor),
    });

    return {
      document: cloneDocument(previous.document),
      cursor: cloneCursor(previous.cursor),
    };
  }

  /**
   * Ponowienie zmian.
   */
  redo(
    current: EditorDocument,
    currentCursor: CursorPosition | null
  ): HistoryStep | null {
    const next = this.redoStack.pop();

    if (!next) {
      return null;
    }

    this.undoStack.push({
      document: cloneDocument(current),
      cursor: cloneCursor(currentCursor),
    });

    return {
      document: cloneDocument(next.document),
      cursor: cloneCursor(next.cursor),
    };
  }

  /**
   * Czy można wykonać Undo.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Czy można wykonać Redo.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Liczba zapisanych kroków Undo.
   */
  size(): number {
    return this.undoStack.length;
  }

  /**
   * Czyści historię.
   */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /**
   * Resetuje historię i zapisuje pierwszy stan.
   */
  reset(
    document: EditorDocument,
    cursor: CursorPosition | null = null
  ): void {
    this.clear();
    this.push(document, cursor);
  }
}
