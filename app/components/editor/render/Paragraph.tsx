"use client";



import {

  type DragEvent,

  type MouseEvent,

  type RefObject,

  useMemo,

} from "react";

import { InlineNode, type InkStroke } from "../types";

import { focusInlineTextNode } from "../focusInlineText";

import { focusInlineMathNode } from "../focusInlineMath";

import { createParagraphNavigator } from "../inlineNavigation";

import TextNode from "../nodes/TextNode";

import MathNode from "../nodes/MathNode";

import ImageNode from "../nodes/ImageNode";

import InkNode from "../nodes/InkNode";

import TrueFalseTableEditor from "../nodes/TrueFalseTableEditor";

import MatchingTableEditor from "../nodes/MatchingTableEditor";

import TableReadOnly from "../nodes/TableReadOnly";



type Props = {

  id: string;

  children: InlineNode[];

  editorRoot?: RefObject<HTMLElement | null>;



  selectedNodeId?: string | null;

  rangeHighlightIds?: ReadonlySet<string>;

  autoFocusMathId?: string | null;

  selected?: boolean;

  dragOverPosition?: "before" | "after" | null;



  onGutterMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;

  onDragHandleStart?: () => void;

  onDragOverPosition?: (position: "before" | "after") => void;

  onDropAt?: () => void;

  onDragEnd?: () => void;



  onTextChange: (

    nodeId: string,

    text: string

  ) => void;



  onMathChange: (

    nodeId: string,

    latex: string

  ) => void;

  onTableTextChange?: (

    tableNodeId: string,

    rowId: string,

    textNodeId: string,

    text: string

  ) => void;

  onTableMathChange?: (

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



  onImageSelect?: (

    paragraphId: string,

    nodeId: string

  ) => void;

  onImageResize?: (

    paragraphId: string,

    nodeId: string,

    width: number,

    height: number

  ) => void;

  onImageRemove?: (

    paragraphId: string,

    nodeId: string

  ) => void;

  onImageMoveStart?: (

    paragraphId: string,

    nodeId: string

  ) => void;



  onInkSelect?: (

    paragraphId: string,

    nodeId: string

  ) => void;

  onInkStrokesChange?: (

    paragraphId: string,

    nodeId: string,

    strokes: InkStroke[]

  ) => void;

  onInkResize?: (

    paragraphId: string,

    nodeId: string,

    width: number,

    height: number

  ) => void;

  onInkRemove?: (

    paragraphId: string,

    nodeId: string

  ) => void;

  onInkMoveStart?: (

    paragraphId: string,

    nodeId: string

  ) => void;

  penMode?: boolean;
  eraserMode?: boolean;
  inkColor?: string;



  onSelectAll?: () => void;

  onMoveToPreviousParagraph?: () => boolean;

  onMoveToNextParagraph?: () => boolean;



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



function resolveDropPosition(

  event: DragEvent<HTMLDivElement>

): "before" | "after" {

  const rect = event.currentTarget.getBoundingClientRect();

  const midpoint = rect.top + rect.height / 2;



  return event.clientY < midpoint ? "before" : "after";

}



export default function Paragraph({

  id,

  children,

  editorRoot,

  selectedNodeId,

  rangeHighlightIds,

  autoFocusMathId,

  selected = false,

  dragOverPosition = null,

  onGutterMouseDown,

  onDragHandleStart,

  onDragOverPosition,

  onDropAt,

  onDragEnd,

  onTextChange,

  onMathChange,

  onTableTextChange,

  onTableMathChange,

  onMathRemove,

  onImageSelect,

  onImageResize,

  onImageRemove,

  onImageMoveStart,

  onInkSelect,

  onInkStrokesChange,

  onInkResize,

  onInkRemove,

  onInkMoveStart,

  penMode = false,
  eraserMode = false,
  inkColor,

  onSelectAll,

  onMoveToPreviousParagraph,

  onMoveToNextParagraph,

  onCursorChange,

  onNodeFocus,

  onNodeBlur,

}: Props) {

  function focusTextNode(

    nodeId: string,

    offset: number

  ) {

    const focus = () => {

      const didFocus = focusInlineTextNode(

        id,

        nodeId,

        offset,

        editorRoot?.current

      );



      if (!didFocus) {

        return;

      }



      onNodeFocus?.(id, nodeId);

      onCursorChange?.(id, nodeId, offset);

    };



    requestAnimationFrame(() => {

      requestAnimationFrame(focus);

    });

  }



  function focusMathNode(

    nodeId: string,

    side: "start" | "end"

  ) {

    const focus = () => {

      const didFocus = focusInlineMathNode(

        id,

        nodeId,

        side,

        editorRoot?.current

      );



      if (!didFocus) {

        return;

      }



      onNodeFocus?.(id, nodeId);

    };



    requestAnimationFrame(() => {

      requestAnimationFrame(focus);

    });

  }



  function focusImageNode(nodeId: string) {

    onImageSelect?.(id, nodeId);

  }



  function focusInkNode(nodeId: string) {

    onInkSelect?.(id, nodeId);

  }



  const navigator = useMemo(

    () =>

      createParagraphNavigator({

        children,

        focusText: focusTextNode,

        focusMath: focusMathNode,

        focusImage: focusImageNode,

        focusInk: focusInkNode,

        removeMath: (nodeId, direction) => {

          onMathRemove?.(id, nodeId, direction);

        },

        removeImage: (nodeId) => {

          onImageRemove?.(id, nodeId);

        },

        removeInk: (nodeId) => {

          onInkRemove?.(id, nodeId);

        },

      }),

    [

      children,

      id,

      onMathRemove,

      onImageRemove,

      onInkRemove,

      onImageSelect,

    ]

  );



  function focusParagraphEnd() {

    const last = children[children.length - 1];



    if (!last) {

      return;

    }



    if (last.type === "text") {

      focusTextNode(last.id, last.text.length);

      return;

    }



    if (last.type === "math") {

      focusMathNode(last.id, "end");

    }

  }



  return (

    <div

      data-paragraph-id={id}

      className={`edunga-paragraph-block${selected ? " is-selected" : ""}${

        dragOverPosition === "before" ? " is-drag-over-top" : ""

      }${dragOverPosition === "after" ? " is-drag-over-bottom" : ""}`}

      onDragOver={(event) => {

        if (!event.dataTransfer.types.includes("application/x-edunga-paragraph")) {

          return;

        }



        event.preventDefault();

        onDragOverPosition?.(resolveDropPosition(event));

      }}

      onDrop={(event) => {

        if (!event.dataTransfer.types.includes("application/x-edunga-paragraph")) {

          return;

        }



        event.preventDefault();

        onDropAt?.();

      }}

    >

      <div className="edunga-paragraph-gutter">

        <button

          type="button"

          className="edunga-paragraph-gutter__button"

          title="Przeciągnij, aby zmienić kolejność"

          draggable

          onMouseDown={onGutterMouseDown}

          onDragStart={(event) => {

            event.dataTransfer.setData(

              "application/x-edunga-paragraph",

              id

            );

            event.dataTransfer.effectAllowed = "move";

            onDragHandleStart?.();

          }}

          onDragEnd={() => onDragEnd?.()}

        >

          ⋮⋮

        </button>

      </div>



      <div

        className="edunga-paragraph-body min-h-[42px] text-lg leading-9 text-inherit"

        onMouseDown={(event) => {

          if (event.target !== event.currentTarget) {

            return;

          }



          event.preventDefault();

          focusParagraphEnd();

        }}

      >

        {children.map((node, index) => {

          if (node.type === "text") {

            const previous = children[index - 1];

            const followsMath = previous?.type === "math";



            return (

              <TextNode

                key={node.id}

                paragraphId={id}

                id={node.id}

                text={node.text}

                followsMath={followsMath}

                selected={

                  selectedNodeId === node.id ||

                  Boolean(rangeHighlightIds?.has(node.id))

                }

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

                onSelectAll={onSelectAll}

                onMoveToPreviousParagraph={

                  onMoveToPreviousParagraph

                }

                onMoveToNextParagraph={

                  onMoveToNextParagraph

                }

                navigation={{

                  arrowLeft: (offset) =>

                    navigator.textArrowLeft(

                      node.id,

                      offset

                    ),

                  arrowRight: (offset, textLength) =>

                    navigator.textArrowRight(

                      node.id,

                      offset,

                      textLength

                    ),

                  arrowUp: (offset) =>

                    navigator.textArrowUp(node.id, offset),

                  arrowDown: (offset, textLength) =>

                    navigator.textArrowDown(

                      node.id,

                      offset,

                      textLength

                    ),

                  backspace: (offset) =>

                    navigator.textBackspace(

                      node.id,

                      offset

                    ),

                  delete: (offset, textLength) =>

                    navigator.textDelete(

                      node.id,

                      offset,

                      textLength

                    ),

                }}

              />

            );

          }



          if (node.type === "math") {

            return (

              <MathNode

                key={node.id}

                id={node.id}

                latex={node.latex}

                selected={

                  selectedNodeId === node.id ||

                  Boolean(rangeHighlightIds?.has(node.id))

                }

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

                onSelectAll={onSelectAll}

                navigation={{

                  arrowLeft: (state) =>

                    navigator.mathArrowLeft(

                      node.id,

                      state

                    ),

                  arrowRight: (state) =>

                    navigator.mathArrowRight(

                      node.id,

                      state

                    ),

                  backspace: (state) =>

                    navigator.mathBackspace(

                      node.id,

                      state

                    ),

                  delete: (state) =>

                    navigator.mathDelete(

                      node.id,

                      state

                    ),

                  moveOut: (direction, state) =>

                    navigator.mathMoveOut(

                      node.id,

                      direction,

                      state

                    ),

                }}

              />

            );

          }



          if (node.type === "image") {

            const nodeIndex = index;

            const previous = children[nodeIndex - 1];

            const next = children[nodeIndex + 1];



            return (

              <ImageNode

                key={node.id}

                id={node.id}

                src={node.src}

                width={node.width}

                height={node.height}

                alt={node.alt}

                align={node.align}

                selected={

                  selectedNodeId === node.id ||

                  Boolean(rangeHighlightIds?.has(node.id))

                }

                onSelect={(nodeId) => onImageSelect?.(id, nodeId)}

                onResize={(nodeId, width, height) =>

                  onImageResize?.(id, nodeId, width, height)

                }

                onRemove={(nodeId) => onImageRemove?.(id, nodeId)}

                onMoveStart={(nodeId) => onImageMoveStart?.(id, nodeId)}

                onArrowLeft={() => {

                  if (previous?.type === "text") {

                    focusTextNode(previous.id, previous.text.length);

                    return;

                  }



                  if (previous?.type === "math") {

                    focusMathNode(previous.id, "end");

                  }

                  if (previous?.type === "ink") {

                    focusInkNode(previous.id);

                  }

                }}

                onArrowRight={() => {

                  if (next?.type === "text") {

                    focusTextNode(next.id, 0);

                    return;

                  }



                  if (next?.type === "math") {

                    focusMathNode(next.id, "start");

                  }

                  if (next?.type === "ink") {

                    focusInkNode(next.id);

                  }

                }}

              />

            );

          }



          if (node.type === "ink") {

            const nodeIndex = index;

            const previous = children[nodeIndex - 1];

            const next = children[nodeIndex + 1];



            return (

              <InkNode

                key={node.id}

                id={node.id}

                width={node.width}

                height={node.height}

                strokes={node.strokes}

                align={node.align}

                selected={

                  selectedNodeId === node.id ||

                  Boolean(rangeHighlightIds?.has(node.id))

                }

                penMode={penMode}
                eraserMode={eraserMode}
                strokeColor={inkColor}

                onSelect={(nodeId) => onInkSelect?.(id, nodeId)}

                onStrokesChange={(nodeId, strokes) =>

                  onInkStrokesChange?.(id, nodeId, strokes)

                }

                onResize={(nodeId, width, height) =>

                  onInkResize?.(id, nodeId, width, height)

                }

                onRemove={(nodeId) => onInkRemove?.(id, nodeId)}

                onMoveStart={(nodeId) => onInkMoveStart?.(id, nodeId)}

                onArrowLeft={() => {

                  if (previous?.type === "text") {

                    focusTextNode(previous.id, previous.text.length);

                    return;

                  }



                  if (previous?.type === "math") {

                    focusMathNode(previous.id, "end");

                    return;

                  }

                  if (previous?.type === "ink") {

                    focusInkNode(previous.id);

                  }

                }}

                onArrowRight={() => {

                  if (next?.type === "text") {

                    focusTextNode(next.id, 0);

                    return;

                  }



                  if (next?.type === "math") {

                    focusMathNode(next.id, "start");

                    return;

                  }

                  if (next?.type === "ink") {

                    focusInkNode(next.id);

                  }

                }}

              />

            );

          }



          if (node.type === "table") {

            return <TableReadOnly key={node.id} node={node} />;

          }



          if (node.type === "matching-table") {

            return (

              <MatchingTableEditor

                key={node.id}

                paragraphId={id}

                node={node}

                editorRoot={editorRoot}

                selectedNodeId={selectedNodeId}

                rangeHighlightIds={rangeHighlightIds}

                autoFocusMathId={autoFocusMathId}

                onTextChange={(tableNodeId, rowId, textNodeId, text) =>

                  onTableTextChange?.(tableNodeId, rowId, textNodeId, text)

                }

                onMathChange={(tableNodeId, rowId, mathNodeId, latex) =>

                  onTableMathChange?.(tableNodeId, rowId, mathNodeId, latex)

                }

                onMathRemove={onMathRemove}

                onCursorChange={onCursorChange}

                onNodeFocus={onNodeFocus}

                onNodeBlur={onNodeBlur}

              />

            );

          }



          if (node.type === "true-false-table") {

            return (

              <TrueFalseTableEditor

                key={node.id}

                paragraphId={id}

                node={node}

                editorRoot={editorRoot}

                selectedNodeId={selectedNodeId}

                rangeHighlightIds={rangeHighlightIds}

                autoFocusMathId={autoFocusMathId}

                onTextChange={(tableNodeId, rowId, textNodeId, text) =>

                  onTableTextChange?.(tableNodeId, rowId, textNodeId, text)

                }

                onMathChange={(tableNodeId, rowId, mathNodeId, latex) =>

                  onTableMathChange?.(tableNodeId, rowId, mathNodeId, latex)

                }

                onMathRemove={onMathRemove}

                onCursorChange={onCursorChange}

                onNodeFocus={onNodeFocus}

                onNodeBlur={onNodeBlur}

              />

            );

          }



          return null;

        })}

      </div>

    </div>

  );

}

