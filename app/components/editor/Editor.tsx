"use client";

import { useRef, useState } from "react";
import Toolbar from "./Toolbar";

import Cursor from "./core/cursor";
import insertMath from "./core/operations/insertMath";

import DocumentRenderer, {
  ParagraphModel,
} from "./render/DocumentRenderer";

type Props = {
  value?: ParagraphModel[];
  onChange?: (document: ParagraphModel[]) => void;
};

export default function Editor({
  value,
  onChange,
}: Props) {
  const cursor = useRef(new Cursor());

  const [document, setDocument] = useState<ParagraphModel[]>(
    value ?? [
      {
        id: crypto.randomUUID(),
        nodes: [
          {
            id: crypto.randomUUID(),
            type: "text",
            text: "",
          },
        ],
      },
    ]
  );

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [autoFocusMathId, setAutoFocusMathId] =
    useState<string | null>(null);

  function update(next: ParagraphModel[]) {
    setDocument(next);
    onChange?.(next);
  }

  function updateText(
    paragraphId: string,
    nodeId: string,
    text: string
  ) {
    update(
      document.map((paragraph) => {
        if (paragraph.id !== paragraphId) {
          return paragraph;
        }

        return {
          ...paragraph,
          nodes: paragraph.nodes.map((node) =>
            node.id === nodeId &&
            node.type === "text"
              ? {
                  ...node,
                  text,
                }
              : node
          ),
        };
      })
    );
  }

  function updateMath(
    paragraphId: string,
    nodeId: string,
    latex: string
  ) {
    update(
      document.map((paragraph) => {
        if (paragraph.id !== paragraphId) {
          return paragraph;
        }

        return {
          ...paragraph,
          nodes: paragraph.nodes.map((node) =>
            node.id === nodeId &&
            node.type === "math"
              ? {
                  ...node,
                  latex,
                }
              : node
          ),
        };
      })
    );
  }

  function addMath() {
    const position = cursor.current.get();

    if (!position) {
      return;
    }

    const result = insertMath(
      document,
      position.paragraphId,
      position.nodeId,
      position.offset
    );

    setAutoFocusMathId(result.insertedNodeId);

    update(result.document);
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900">

      <Toolbar
    onInsertMath={addMath}
/>

      <div className="
    min-h-[260px]
    cursor-text
    bg-zinc-900
    p-6
  "
>
  <DocumentRenderer
    document={document}
    selectedNodeId={selectedNodeId}
    autoFocusMathId={autoFocusMathId}
    onTextChange={updateText}
    onMathChange={updateMath}
    onCursorChange={(
      paragraphId,
      nodeId,
      offset
    ) => {
      cursor.current.set({
        paragraphId,
        nodeId,
        offset,
      });
    }}
    onNodeFocus={(_, nodeId) =>
      setSelectedNodeId(nodeId)
    }
    onNodeBlur={() =>
      setSelectedNodeId(null)
    }
  />

      </div>

    </div>
  );
}