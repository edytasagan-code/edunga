import {
  createTextNode,
  ensureDocumentInlineEditing,
  generateId,
} from "../document";
import { EditorDocument } from "../../types";

/**
 * Replaces the entire editor document with one empty paragraph ready for typing.
 */
export default function clearEditorContent(
  document: EditorDocument
): EditorDocument {
  const paragraphId =
    document.paragraphs[0]?.id ?? generateId();

  const cleared: EditorDocument = {
    ...document,
    paragraphs: [
      {
        id: paragraphId,
        children: [createTextNode("")],
      },
    ],
  };

  return ensureDocumentInlineEditing(cleared);
}
