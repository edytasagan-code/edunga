import { DocumentModel } from "../types";

export default class History {

  private undoStack: DocumentModel[] = [];

  private redoStack: DocumentModel[] = [];

  push(document: DocumentModel) {
    this.undoStack.push(
      structuredClone(document)
    );

    this.redoStack = [];
  }

  undo(current: DocumentModel) {

    const previous =
      this.undoStack.pop();

    if (!previous) {
      return current;
    }

    this.redoStack.push(
      structuredClone(current)
    );

    return previous;
  }

  redo(current: DocumentModel) {

    const next =
      this.redoStack.pop();

    if (!next) {
      return current;
    }

    this.undoStack.push(
      structuredClone(current)
    );

    return next;
  }

}