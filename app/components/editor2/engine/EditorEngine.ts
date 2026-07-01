import Cursor from "./Cursor";
import History from "./History";
import Selection from "./Selection";

import { createDocument } from "../document";

import { DocumentModel } from "../types";

export default class EditorEngine {

  document: DocumentModel;

  cursor = new Cursor();

  selection = new Selection();

  history = new History();

  constructor() {
    this.document =
      createDocument();
  }

  setDocument(
    document: DocumentModel
  ) {

    this.history.push(this.document);

    this.document = document;

  }

}