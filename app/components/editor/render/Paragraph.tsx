"use client";

import TextNode from "../nodes/TextNode";
import MathNode from "../nodes/MathNode";

export type ParagraphNode =
  | {
      id: string;
      type: "text";
      text: string;
    }
  | {
      id: string;
      type: "math";
      latex: string;
    };

type Props = {
  id: string;
  nodes: ParagraphNode[];

  selectedNodeId?: string | null;
  autoFocusMathId?: string | null;

  onTextChange: (
    nodeId: string,
    text: string
  ) => void;

  onMathChange: (
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

export default function Paragraph({
  id,
  nodes,
  selectedNodeId,
  autoFocusMathId,
  onTextChange,
  onMathChange,
  onCursorChange,
  onNodeFocus,
  onNodeBlur,
}: Props) {
  return (
    <div
      data-paragraph-id={id}
      className="
flex
flex-wrap
items-center
gap-1
min-h-[42px]
leading-9
"
    >
      {nodes.map((node) => {
        if (node.type === "text") {
          return (
            <TextNode
              key={node.id}
              paragraphId={id}
              id={node.id}
              text={node.text}
              selected={selectedNodeId === node.id}
              onChange={(text) =>
                onTextChange(node.id, text)
              }
              onCursorChange={onCursorChange}
              onFocus={(nodeId) =>
                onNodeFocus?.(id, nodeId)
              }
              onBlur={(nodeId) =>
                onNodeBlur?.(id, nodeId)
              }
            />
          );
        }

        return (
          <MathNode
            key={node.id}
            id={node.id}
            latex={node.latex}
            selected={selectedNodeId === node.id}
            autoFocus={autoFocusMathId === node.id}
            onChange={(latex) =>
              onMathChange(node.id, latex)
            }
            onFocus={(nodeId) =>
              onNodeFocus?.(id, nodeId)
            }
            onBlur={(nodeId) =>
              onNodeBlur?.(id, nodeId)
            }
          />
        );
      })}
    </div>
  );
}