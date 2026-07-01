"use client";

import Paragraph, { ParagraphNode } from "./Paragraph";

export type ParagraphModel = {
  id: string;
  nodes: ParagraphNode[];
};

type Props = {
  document: ParagraphModel[];

  selectedNodeId?: string | null;
  autoFocusMathId?: string | null;

  onTextChange: (
    paragraphId: string,
    nodeId: string,
    text: string
  ) => void;

  onMathChange: (
    paragraphId: string,
    nodeId: string,
    latex: string
  ) => void;

  onCursorChange?: (
    paragraphId: string,
    nodeId: string,
    offset: number
  ) => void;

  onNodeFocus?: (
    paragraphId: string,
    nodeId: string
  ) => void;

  onNodeBlur?: (
    paragraphId: string,
    nodeId: string
  ) => void;
};

export default function DocumentRenderer({
  document,
  selectedNodeId,
  autoFocusMathId,
  onTextChange,
  onMathChange,
  onCursorChange,
  onNodeFocus,
  onNodeBlur,
}: Props) {
  return (
    <div className="space-y-2">
      {document.map((paragraph) => (
        <Paragraph
          key={paragraph.id}
          id={paragraph.id}
          nodes={paragraph.nodes}
          selectedNodeId={selectedNodeId}
          autoFocusMathId={autoFocusMathId}
          onTextChange={(nodeId, text) =>
            onTextChange(paragraph.id, nodeId, text)
          }
          onMathChange={(nodeId, latex) =>
            onMathChange(paragraph.id, nodeId, latex)
          }
          onCursorChange={onCursorChange}
          onNodeFocus={(nodeId) =>
            onNodeFocus?.(paragraph.id, nodeId)
          }
          onNodeBlur={(nodeId) =>
            onNodeBlur?.(paragraph.id, nodeId)
          }
        />
      ))}
    </div>
  );
}