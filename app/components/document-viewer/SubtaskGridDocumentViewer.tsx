"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import { EditorDocumentRenderer } from "@/app/lib/document-renderer";
import {
  clampSubtaskGridOffsetPx,
  collectSubtaskLabels,
  getParagraphSubtaskLabel,
  partitionSubtasksIntoColumns,
  resolveSubtaskBlockMarginTopPx,
  splitDocumentForSubtaskGrid,
  SUBTASK_GRID_WORKSPACE_HEIGHT_PX,
  type SubtaskGridOffsets,
} from "@/app/lib/subtaskGridLayout";

import type { Paragraph } from "../editor/types";
import DocumentViewerContent from "./DocumentViewerContent";
import "./subtask-grid.css";

const ReadOnlyMath = dynamic(() => import("./ReadOnlyMath"), {
  ssr: false,
});

type Props = {
  value: unknown;
  preview?: boolean;
  offsets?: SubtaskGridOffsets;
  draggable?: boolean;
  onOffsetChange?: (label: string, offsetPx: number) => void;
};

function SubtaskGridParagraph({ paragraph }: { paragraph: Paragraph }) {
  return (
    <EditorDocumentRenderer
      document={{ version: 1, paragraphs: [paragraph] }}
      renderText={(node) => (
        <span
          key={node.id}
          data-node-type="text"
          className="whitespace-pre-wrap"
        >
          {node.text}
        </span>
      )}
      renderMath={(node) => (
        <ReadOnlyMath key={node.id} latex={node.latex} />
      )}
      renderParagraph={({ paragraph: current, children }) => (
        <div key={current.id} className="document-viewer-paragraph">
          {children}
        </div>
      )}
    />
  );
}

function SubtaskGridBlock({
  paragraph,
  blockIndexInColumn,
  offsets,
  draggable,
  onOffsetChange,
}: {
  paragraph: Paragraph;
  blockIndexInColumn: number;
  offsets?: SubtaskGridOffsets;
  draggable: boolean;
  onOffsetChange?: (label: string, offsetPx: number) => void;
}) {
  const label = getParagraphSubtaskLabel(paragraph);
  const [dragging, setDragging] = useState(false);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!draggable || !onOffsetChange || !label) {
        return;
      }

      const subtaskLabel = label;
      const changeOffset = onOffsetChange;
      event.preventDefault();
      event.stopPropagation();

      const startY = event.clientY;
      const startOffset = offsets?.[label] ?? 0;
      const handle = event.currentTarget;

      setDragging(true);
      window.document.body.classList.add("subtask-grid-layout--dragging");
      handle.setPointerCapture(event.pointerId);

      function onPointerMove(moveEvent: PointerEvent) {
        const nextOffset = clampSubtaskGridOffsetPx(
          startOffset + (moveEvent.clientY - startY)
        );
        changeOffset(subtaskLabel, nextOffset);
      }

      function onPointerUp(upEvent: PointerEvent) {
        const nextOffset = clampSubtaskGridOffsetPx(
          startOffset + (upEvent.clientY - startY)
        );
        changeOffset(subtaskLabel, nextOffset);
        setDragging(false);
        window.document.body.classList.remove("subtask-grid-layout--dragging");

        if (handle.hasPointerCapture(upEvent.pointerId)) {
          handle.releasePointerCapture(upEvent.pointerId);
        }

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [draggable, label, offsets, onOffsetChange]
  );

  if (!label) {
    return null;
  }

  const marginTop = resolveSubtaskBlockMarginTopPx(
    blockIndexInColumn,
    label,
    offsets
  );

  return (
    <div
      className={`subtask-grid-layout__block${
        draggable ? " subtask-grid-layout__block--draggable" : ""
      }${dragging ? " subtask-grid-layout__block--dragging" : ""}`}
      style={{ marginTop }}
    >
      {draggable ? (
        <button
          type="button"
          aria-label={`Przesuń podpunkt ${label}) w pionie`}
          className="subtask-grid-layout__drag-handle"
          onPointerDown={startDrag}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}

      <div className="subtask-grid-layout__cell">
        <SubtaskGridParagraph paragraph={paragraph} />
        <div
          aria-hidden
          className="subtask-grid-layout__workspace"
          style={{ minHeight: SUBTASK_GRID_WORKSPACE_HEIGHT_PX }}
        />
      </div>
    </div>
  );
}

function SubtaskGridColumn({
  paragraphs,
  offsets,
  draggable,
  onOffsetChange,
}: {
  paragraphs: Paragraph[];
  offsets?: SubtaskGridOffsets;
  draggable: boolean;
  onOffsetChange?: (label: string, offsetPx: number) => void;
}) {
  return (
    <div className="subtask-grid-layout__column">
      {paragraphs.map((paragraph, index) => (
        <SubtaskGridBlock
          key={paragraph.id}
          paragraph={paragraph}
          blockIndexInColumn={index}
          offsets={offsets}
          draggable={draggable}
          onOffsetChange={onOffsetChange}
        />
      ))}
    </div>
  );
}

export default function SubtaskGridDocumentViewer({
  value,
  preview = false,
  offsets,
  draggable = false,
  onOffsetChange,
}: Props) {
  const split = splitDocumentForSubtaskGrid(value);

  if (!split) {
    return null;
  }

  const { left, right } = partitionSubtasksIntoColumns(split.subtasks);
  const validLabels = collectSubtaskLabels(split.subtasks);
  const canDrag = draggable && Boolean(onOffsetChange);

  const wrapperClass = [
    "subtask-grid-layout document-viewer text-inherit",
    preview ? "editor-document-preview" : "",
    canDrag ? "subtask-grid-layout--editable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      {split.instruction.paragraphs.length > 0 ? (
        <div className="subtask-grid-layout__instruction">
          <DocumentViewerContent document={split.instruction} />
        </div>
      ) : null}

      <div className="subtask-grid-layout__columns">
        <SubtaskGridColumn
          paragraphs={left}
          offsets={offsets}
          draggable={canDrag}
          onOffsetChange={(label, offsetPx) =>
            onOffsetChange?.(label, offsetPx)
          }
        />
        <div aria-hidden className="subtask-grid-layout__divider" />
        <SubtaskGridColumn
          paragraphs={right}
          offsets={offsets}
          draggable={canDrag}
          onOffsetChange={(label, offsetPx) =>
            onOffsetChange?.(label, offsetPx)
          }
        />
      </div>

      {canDrag && validLabels.length > 0 ? (
        <p className="subtask-grid-layout__hint">
          Przeciągnij uchwyt nad podpunktem, aby dodać odstęp w pionie.
        </p>
      ) : null}
    </div>
  );
}
