import { EditorDocument } from "../types";
import { cloneDocument } from "./document";

const MAX_HISTORY = 100;

export default class HistoryManager {
  private undoStack: EditorDocument[] = [];
  private redoStack: EditorDocument[] = [];

  /**
   * Zapisuje aktualny stan dokumentu.
   * Wywoływać przed każdą zmianą.
   */
  push(document: EditorDocument): void {
    this.undoStack.push(cloneDocument(document));

    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  /**
   * Cofnięcie zmian.
   */
  undo(current: EditorDocument): EditorDocument | null {
    const previous = this.undoStack.pop();

    if (!previous) {
      return null;
    }

    this.redoStack.push(cloneDocument(current));

    return cloneDocument(previous);
  }

  /**
   * Ponowienie zmian.
   */
  redo(current: EditorDocument): EditorDocument | null {
    const next = this.redoStack.pop();

    if (!next) {
      return null;
    }

    this.undoStack.push(cloneDocument(current));

    return cloneDocument(next);
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
  reset(document: EditorDocument): void {
    this.clear();
    this.push(document);
  }
}