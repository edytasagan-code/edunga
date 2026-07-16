import { EditorDocument } from "./types";

export function parseEditorDocument(
  value: unknown
): EditorDocument | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const doc = value as EditorDocument;

  if (
    typeof doc.version !== "number" ||
    !Array.isArray(doc.paragraphs)
  ) {
    return null;
  }

  return doc;
}
