export interface CursorPosition {
  paragraphId: string;
  nodeId: string;
  offset: number;
}

export default class Cursor {
  private position: CursorPosition | null = null;

  /**
   * Ustawia pozycję kursora.
   */
  set(position: CursorPosition): void {
    this.position = {
      ...position,
    };
  }

  /**
   * Pobiera aktualną pozycję kursora.
   */
  get(): CursorPosition | null {
    if (!this.position) {
      return null;
    }

    return {
      ...this.position,
    };
  }

  /**
   * Czy kursor jest ustawiony.
   */
  has(): boolean {
    return this.position !== null;
  }

  /**
   * Czyści kursor.
   */
  clear(): void {
    this.position = null;
  }

  /**
   * Aktualizuje offset.
   */
  setOffset(offset: number): void {
    if (!this.position) {
      return;
    }

    this.position = {
      ...this.position,
      offset,
    };
  }

  /**
   * Aktualizuje node.
   */
  setNode(
    paragraphId: string,
    nodeId: string,
    offset = 0
  ): void {
    this.position = {
      paragraphId,
      nodeId,
      offset,
    };
  }

  /**
   * Czy kursor znajduje się
   * w podanym node.
   */
  isInside(
    paragraphId: string,
    nodeId: string
  ): boolean {
    if (!this.position) {
      return false;
    }

    return (
      this.position.paragraphId === paragraphId &&
      this.position.nodeId === nodeId
    );
  }
}