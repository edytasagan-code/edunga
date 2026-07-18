"use client";

import { buildDocumentOutline } from "./documentOutline";
import type { EditorDocument } from "./types";

type Props = {
  document: EditorDocument;
  activeParagraphId?: string | null;
  onSelect: (paragraphId: string) => void;
};

export default function DocumentOutlinePanel({
  document,
  activeParagraphId,
  onSelect,
}: Props) {
  const items = buildDocumentOutline(document);

  return (
    <div className="edunga-editor-outline">
      <div className="edunga-editor-outline__header">Spis bloków</div>
      <div className="edunga-editor-outline__list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`edunga-editor-outline__item${
              activeParagraphId === item.id ? " is-active" : ""
            }`}
            onClick={() => onSelect(item.id)}
          >
            <span className="edunga-editor-outline__item-label">
              {item.index + 1}
              {item.subtaskLabel
                ? ` · ${item.subtaskLabel.toUpperCase()})`
                : ""}
            </span>
            <span className="edunga-editor-outline__item-preview">
              {item.preview}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
