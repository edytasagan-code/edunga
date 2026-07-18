"use client";

import { parseEditorDocument } from "../editor/parseEditorDocument";
import { EditorDocument } from "../editor/types";

import DocumentViewerContent from "./DocumentViewerContent";
import "./styles.css";

type Props = {
  value: unknown;
  /** First paragraph only, clipped to ~2 lines */
  compact?: boolean;
  /** Smaller typography matching import/generator panels */
  preview?: boolean;
};

function resolveDocument(value: unknown): EditorDocument | null {
  return parseEditorDocument(value);
}

export function hasAnswerContent(value: unknown): boolean {
  const document = resolveDocument(value);

  if (!document) {
    return false;
  }

  return document.paragraphs.some((paragraph) =>
    paragraph.children.some((node) => {
      if (node.type === "math") {
        return node.latex.trim().length > 0;
      }

      if (node.type === "ink") {
        return node.strokes.length > 0;
      }

      if (node.type === "image") {
        return node.src.trim().length > 0;
      }

      if (node.type === "text") {
        const text = node.text.trim();

        if (!text) {
          return false;
        }

        return !/^[a-d]\)\s*$/i.test(text);
      }

      return false;
    })
  );
}

export function hasDocumentContent(value: unknown): boolean {
  const document = resolveDocument(value);

  if (!document) {
    return typeof value === "string" && value.trim().length > 0;
  }

  return document.paragraphs.some((paragraph) =>
    paragraph.children.some((node) => {
      if (node.type === "text") {
        return node.text.trim().length > 0;
      }

      if (node.type === "math") {
        return node.latex.trim().length > 0;
      }

      if (node.type === "image") {
        return node.src.trim().length > 0;
      }

      if (node.type === "ink") {
        return node.strokes.length > 0;
      }

      if (node.type === "table") {
        return node.rows.length > 0;
      }

      if (node.type === "true-false-table") {
        return node.rows.length > 0;
      }

      if (node.type === "matching-table") {
        return node.rows.length > 0 || node.options.length > 0;
      }

      return false;
    })
  );
}

export default function DocumentViewer({
  value,
  compact = false,
  preview = false,
}: Props) {
  const document = resolveDocument(value);

  if (!document) {
    if (typeof value === "string" && value.trim()) {
      return (
        <div className="document-viewer text-inherit">
          <div className="document-viewer-paragraph text-lg leading-7 whitespace-pre-wrap">
            {value}
          </div>
        </div>
      );
    }

    return null;
  }

  const paragraphs = compact
    ? document.paragraphs.slice(0, 1)
    : document.paragraphs;

  if (paragraphs.length === 0) {
    return null;
  }

  const viewDocument = compact
    ? { ...document, paragraphs }
    : document;

  const wrapperClass = [
    "document-viewer text-inherit",
    compact ? "document-viewer--compact" : "",
    preview && !compact ? "editor-document-preview" : "",
    preview && compact ? "editor-document-preview editor-document-preview--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      <DocumentViewerContent document={viewDocument} />
    </div>
  );
}
