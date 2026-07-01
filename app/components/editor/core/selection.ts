import { Position, Selection } from "../types";

export default class SelectionManager {
  private selection: Selection | null = null;

  /**
   * Ustawia pojedynczy kursor.
   */
  setCursor(position: Position): void {
    this.selection = {
      anchor: { ...position },
      focus: { ...position },
    };
  }

  /**
   * Ustawia zaznaczenie.
   */
  setSelection(anchor: Position, focus: Position): void {
    this.selection = {
      anchor: { ...anchor },
      focus: { ...focus },
    };
  }

  /**
   * Pobiera aktualne zaznaczenie.
   */
  getSelection(): Selection | null {
    if (!this.selection) {
      return null;
    }

    return {
      anchor: { ...this.selection.anchor },
      focus: { ...this.selection.focus },
    };
  }

  /**
   * Zwraca aktualną pozycję kursora.
   * Jeżeli istnieje zaznaczenie, zwracany jest focus.
   */
  getCursor(): Position | null {
    if (!this.selection) {
      return null;
    }

    return { ...this.selection.focus };
  }

  /**
   * Czy istnieje zaznaczenie.
   */
  hasSelection(): boolean {
    return this.selection !== null;
  }

  /**
   * Czy zaznaczenie jest zwinięte (sam kursor).
   */
  isCollapsed(): boolean {
    if (!this.selection) {
      return true;
    }

    const { anchor, focus } = this.selection;

    return (
      anchor.paragraphId === focus.paragraphId &&
      anchor.nodeId === focus.nodeId &&
      anchor.offset === focus.offset
    );
  }

  /**
   * Aktualizuje tylko pozycję kursora.
   */
  moveCursor(position: Position): void {
    this.setCursor(position);
  }

  /**
   * Czyści zaznaczenie.
   */
  clear(): void {
    this.selection = null;
  }

  /**
   * Resetuje manager.
   */
  reset(): void {
    this.clear();
  }
}