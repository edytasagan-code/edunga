"use client";

import { useMemo } from "react";

import { createParagraphNavigator } from "../inlineNavigation";
import type { MatchingTableNode } from "../types";
import MathNode from "./MathNode";
import TextNode from "./TextNode";
import MatchingTableView from "./MatchingTableView";

type Props = {
  paragraphId: string;
  node: MatchingTableNode;
  editorRoot?: React.RefObject<HTMLElement | null>;
  selectedNodeId?: string | null;
  rangeHighlightIds?: ReadonlySet<string>;
  autoFocusMathId?: string | null;
  onTextChange: (
    tableNodeId: string,
    rowId: string,
    textNodeId: string,
    text: string
  ) => void;
  onMathChange: (
    tableNodeId: string,
    rowId: string,
    mathNodeId: string,
    latex: string
  ) => void;
  onMathRemove?: (
    paragraphId: string,
    nodeId: string,
    direction: "backward" | "forward"
  ) => void;
  onCursorChange?: (
    paragraphId: string,
    nodeId: string,
    offset: number
  ) => void;
  onNodeFocus?: (paragraphId: string, nodeId: string) => void;
  onNodeBlur?: (paragraphId: string, nodeId: string) => void;
};

export default function MatchingTableEditor({
  paragraphId,
  node,
  editorRoot,
  selectedNodeId,
  rangeHighlightIds,
  autoFocusMathId,
  onTextChange,
  onMathChange,
  onMathRemove,
  onCursorChange,
  onNodeFocus,
  onNodeBlur,
}: Props) {
  return (
    <MatchingTableView
      node={node}
      renderLeft={(rowId, _children, rowIndex) => {
        const row = node.rows[rowIndex];

        if (!row) {
          return null;
        }

        return (
          <MatchingTableRowEditor
            key={row.id}
            paragraphId={paragraphId}
            tableNodeId={node.id}
            rowId={rowId}
            row={row}
            editorRoot={editorRoot}
            selectedNodeId={selectedNodeId}
            rangeHighlightIds={rangeHighlightIds}
            autoFocusMathId={autoFocusMathId}
            onTextChange={onTextChange}
            onMathChange={onMathChange}
            onMathRemove={onMathRemove}
            onCursorChange={onCursorChange}
            onNodeFocus={onNodeFocus}
            onNodeBlur={onNodeBlur}
          />
        );
      }}
    />
  );
}

function MatchingTableRowEditor({
  paragraphId,
  tableNodeId,
  rowId,
  row,
  selectedNodeId,
  rangeHighlightIds,
  autoFocusMathId,
  onTextChange,
  onMathChange,
  onMathRemove,
  onCursorChange,
  onNodeFocus,
  onNodeBlur,
}: {
  paragraphId: string;
  tableNodeId: string;
  rowId: string;
  row: MatchingTableNode["rows"][number];
  editorRoot?: React.RefObject<HTMLElement | null>;
  selectedNodeId?: string | null;
  rangeHighlightIds?: ReadonlySet<string>;
  autoFocusMathId?: string | null;
  onTextChange: Props["onTextChange"];
  onMathChange: Props["onMathChange"];
  onMathRemove?: Props["onMathRemove"];
  onCursorChange?: Props["onCursorChange"];
  onNodeFocus?: Props["onNodeFocus"];
  onNodeBlur?: Props["onNodeBlur"];
}) {
  const navigator = useMemo(
    () =>
      createParagraphNavigator({
        children: row.left,
        focusText: () => {},
        focusMath: () => {},
        removeMath: (nodeId, direction) => {
          onMathRemove?.(paragraphId, nodeId, direction);
        },
      }),
    [row.left, paragraphId, onMathRemove]
  );

  return (
    <>
      {row.left.map((child, index) => {
        if (child.type === "text") {
          const previous = row.left[index - 1];
          const followsMath = previous?.type === "math";

          return (
            <TextNode
              key={child.id}
              paragraphId={paragraphId}
              id={child.id}
              text={child.text}
              followsMath={followsMath}
              selected={
                selectedNodeId === child.id ||
                Boolean(rangeHighlightIds?.has(child.id))
              }
              onChange={(text) =>
                onTextChange(tableNodeId, rowId, child.id, text)
              }
              onCursorChange={onCursorChange}
              onFocus={(nodeId) => onNodeFocus?.(paragraphId, nodeId)}
              onBlur={(nodeId) => onNodeBlur?.(paragraphId, nodeId)}
              navigation={{
                arrowLeft: (offset) =>
                  navigator.textArrowLeft(child.id, offset),
                arrowRight: (offset, textLength) =>
                  navigator.textArrowRight(child.id, offset, textLength),
                arrowUp: (offset) =>
                  navigator.textArrowUp(child.id, offset),
                arrowDown: (offset, textLength) =>
                  navigator.textArrowDown(child.id, offset, textLength),
                backspace: (offset) =>
                  navigator.textBackspace(child.id, offset),
                delete: (offset, textLength) =>
                  navigator.textDelete(child.id, offset, textLength),
              }}
            />
          );
        }

        if (child.type === "math") {
          return (
            <MathNode
              key={child.id}
              id={child.id}
              latex={child.latex}
              selected={
                selectedNodeId === child.id ||
                Boolean(rangeHighlightIds?.has(child.id))
              }
              autoFocus={autoFocusMathId === child.id}
              onChange={(latex) =>
                onMathChange(tableNodeId, rowId, child.id, latex)
              }
              onFocus={(nodeId) => onNodeFocus?.(paragraphId, nodeId)}
              onBlur={(nodeId) => onNodeBlur?.(paragraphId, nodeId)}
              navigation={{
                arrowLeft: (state) =>
                  navigator.mathArrowLeft(child.id, state),
                arrowRight: (state) =>
                  navigator.mathArrowRight(child.id, state),
                backspace: (state) =>
                  navigator.mathBackspace(child.id, state),
                delete: (state) => navigator.mathDelete(child.id, state),
                moveOut: (direction, state) =>
                  navigator.mathMoveOut(child.id, direction, state),
              }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
