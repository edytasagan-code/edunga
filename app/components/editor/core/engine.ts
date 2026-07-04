import {
  EditorDocument,
  Position,
  Selection,
} from "../types";

import { createEmptyDocument } from "./document";
import HistoryManager from "./history";
import SelectionManager from "./selection";
import insertText from "./operations/insertText";

export type EditorEvent =
  | "change"
  | "selection"
  | "history";

export type EditorListener = (
  engine: EditorEngine
) => void;

export default class EditorEngine {
  private document: EditorDocument;

  private history: HistoryManager;

  private selection: SelectionManager;

  private listeners = new Map<
    EditorEvent,
    Set<EditorListener>
  >();

  constructor(document?: EditorDocument) {
    this.document = document ?? createEmptyDocument();

    this.history = new HistoryManager();

    this.selection = new SelectionManager();

    this.history.reset(this.document);
  }

  /**
   * Aktualny dokument.
   */
  getDocument(): EditorDocument {
    return this.document;
  }

  /**
   * Podmienia cały dokument.
   */
  setDocument(document: EditorDocument): void {
    this.document = document;

    this.history.reset(document);

    this.emit("change");
  }

  /**
   * Aktualne zaznaczenie.
   */
  getSelection(): Selection | null {
    return this.selection.getSelection();
  }

  /**
   * Aktualna pozycja kursora.
   */
  getCursor(): Position | null {
    return this.selection.getCursor();
  }

  /**
   * Ustawia kursor.
   */
  setCursor(position: Position): void {
    this.selection.setCursor(position);

    this.emit("selection");
  }

  /**
   * Ustawia zaznaczenie.
   */
  setSelection(
    anchor: Position,
    focus: Position
  ): void {
    this.selection.setSelection(anchor, focus);

    this.emit("selection");
  }

  /**
   * Rejestracja listenera.
   */
  on(
    event: EditorEvent,
    listener: EditorListener
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);
  }

  /**
   * Usuwa listener.
   */
  off(
    event: EditorEvent,
    listener: EditorListener
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Powiadamia o zmianie.
   */
  protected emit(event: EditorEvent): void {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      listener(this);
    });
  }

  /**
   * Czy można wykonać Undo.
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Czy można wykonać Redo.
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /**
   * Undo.
   */
  undo(): void {
    const previous = this.history.undo(this.document);

    if (!previous) {
      return;
    }

    this.document = previous;

    this.emit("history");
    this.emit("change");
  }

  /**
   * Redo.
   */
  redo(): void {
    const next = this.history.redo(this.document);

    if (!next) {
      return;
    }

    this.document = next;

    this.emit("history");
    this.emit("change");
  }
}