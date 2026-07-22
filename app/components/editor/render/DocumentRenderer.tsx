"use client";



import { type RefObject, useCallback, useMemo } from "react";

import { EditorDocument, type InkStroke } from "../types";

import Paragraph from "./Paragraph";

import {

  focusNextParagraph,

  focusPreviousParagraph,

} from "../documentNavigation";

import { buildSectionGroups } from "../documentOutline";



type Props = {

  document: EditorDocument;

  editorRoot?: RefObject<HTMLElement | null>;



  selectedNodeId?: string | null;

  rangeHighlightIds?: ReadonlySet<string>;

  autoFocusMathId?: string | null;



  selectedParagraphIds?: ReadonlySet<string>;

  collapsedSectionIds?: ReadonlySet<string>;

  dragOverParagraphId?: string | null;

  dragOverPosition?: "before" | "after" | null;



  onParagraphSelect?: (

    paragraphId: string,

    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }

  ) => void;

  onParagraphDragStart?: (paragraphId: string) => void;

  onParagraphDragOver?: (

    paragraphId: string,

    position: "before" | "after"

  ) => void;

  onParagraphDrop?: (paragraphId: string) => void;

  onParagraphDragEnd?: () => void;

  onToggleSection?: (sectionId: string) => void;



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

  onTableTextChange?: (

    paragraphId: string,

    tableNodeId: string,

    rowId: string,

    textNodeId: string,

    text: string

  ) => void;

  onTableMathChange?: (

    paragraphId: string,

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

  onInkStrokeSelectionChange?: (

    paragraphId: string,

    nodeId: string,

    indices: number[]

  ) => void;

  selectedInkStrokeIndices?: number[];

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

  editorRoot,

  selectedNodeId,

  rangeHighlightIds,

  autoFocusMathId,

  selectedParagraphIds,

  collapsedSectionIds,

  dragOverParagraphId,

  dragOverPosition,

  onParagraphSelect,

  onParagraphDragStart,

  onParagraphDragOver,

  onParagraphDrop,

  onParagraphDragEnd,

  onToggleSection,

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

  onInkStrokeSelectionChange,

  selectedInkStrokeIndices = [],

  onInkStrokesChange,

  onInkResize,

  onInkRemove,

  onInkMoveStart,

  penMode = false,
  eraserMode = false,
  inkColor,

  onSelectAll,

  onCursorChange,

  onNodeFocus,

  onNodeBlur,

}: Props) {

  const moveToPreviousParagraph = useCallback(

    (paragraphId: string) => {

      return focusPreviousParagraph(

        document,

        paragraphId,

        editorRoot?.current ?? null

      );

    },

    [document, editorRoot]

  );



  const moveToNextParagraph = useCallback(

    (paragraphId: string) => {

      return focusNextParagraph(

        document,

        paragraphId,

        editorRoot?.current ?? null

      );

    },

    [document, editorRoot]

  );



  const sectionGroups = useMemo(

    () => buildSectionGroups(document),

    [document]

  );

  const useSections = sectionGroups.length > 1;



  function renderParagraph(paragraph: (typeof document.paragraphs)[number]) {

    return (

      <Paragraph

        key={paragraph.id}

        id={paragraph.id}

        editorRoot={editorRoot}

        children={paragraph.children}

        selectedNodeId={selectedNodeId}

        rangeHighlightIds={rangeHighlightIds}

        autoFocusMathId={autoFocusMathId}

        selected={Boolean(selectedParagraphIds?.has(paragraph.id))}

        dragOverPosition={

          dragOverParagraphId === paragraph.id

            ? dragOverPosition

            : null

        }

        onGutterMouseDown={(event) => {

          event.preventDefault();

          event.stopPropagation();

          onParagraphSelect?.(paragraph.id, {

            shiftKey: event.shiftKey,

            ctrlKey: event.ctrlKey,

            metaKey: event.metaKey,

          });

        }}

        onDragHandleStart={() => onParagraphDragStart?.(paragraph.id)}

        onDragOverPosition={(position) =>

          onParagraphDragOver?.(paragraph.id, position)

        }

        onDropAt={() => onParagraphDrop?.(paragraph.id)}

        onDragEnd={() => onParagraphDragEnd?.()}

        onTextChange={(nodeId, text) =>

          onTextChange(paragraph.id, nodeId, text)

        }

        onMathChange={(nodeId, latex) =>

          onMathChange(paragraph.id, nodeId, latex)

        }

        onTableTextChange={(tableNodeId, rowId, textNodeId, text) =>

          onTableTextChange?.(

            paragraph.id,

            tableNodeId,

            rowId,

            textNodeId,

            text

          )

        }

        onTableMathChange={(tableNodeId, rowId, mathNodeId, latex) =>

          onTableMathChange?.(

            paragraph.id,

            tableNodeId,

            rowId,

            mathNodeId,

            latex

          )

        }

        onMathRemove={onMathRemove}

        onImageSelect={onImageSelect}

        onImageResize={onImageResize}

        onImageRemove={onImageRemove}

        onImageMoveStart={onImageMoveStart}

        onInkSelect={onInkSelect}

        onInkStrokeSelectionChange={onInkStrokeSelectionChange}

        selectedInkStrokeIndices={selectedInkStrokeIndices}

        onInkStrokesChange={onInkStrokesChange}

        onInkResize={onInkResize}

        onInkRemove={onInkRemove}

        onInkMoveStart={onInkMoveStart}

        penMode={penMode}
        eraserMode={eraserMode}
        inkColor={inkColor}

        onSelectAll={onSelectAll}

        onMoveToPreviousParagraph={() =>

          moveToPreviousParagraph(paragraph.id)

        }

        onMoveToNextParagraph={() =>

          moveToNextParagraph(paragraph.id)

        }

        onCursorChange={onCursorChange}

        onNodeFocus={(nodeId) => onNodeFocus?.(paragraph.id, nodeId)}

        onNodeBlur={(nodeId) => onNodeBlur?.(paragraph.id, nodeId)}

      />

    );

  }



  if (!useSections) {

    return (

      <div

        className="edunga-editor-content space-y-2"

        data-edunga-editor-content

      >

        {document.paragraphs.map((paragraph) => renderParagraph(paragraph))}

      </div>

    );

  }



  return (

    <div

      className="edunga-editor-content space-y-3"

      data-edunga-editor-content

    >

      {sectionGroups.map((section) => {

        const collapsed = Boolean(collapsedSectionIds?.has(section.id));



        return (

          <section

            key={section.id}

            className={`edunga-section-group${

              collapsed ? " is-collapsed" : ""

            }`}

          >

            <div className="edunga-section-group__header">

              <button

                type="button"

                className="edunga-section-group__toggle"

                onClick={() => onToggleSection?.(section.id)}

              >

                {collapsed ? "▶" : "▼"} {section.title}

              </button>

            </div>

            <div className="edunga-section-group__body space-y-2">

              {section.paragraphIds.map((paragraphId) => {

                const paragraph = document.paragraphs.find(

                  (item) => item.id === paragraphId

                );



                if (!paragraph) {

                  return null;

                }



                return renderParagraph(paragraph);

              })}

            </div>

          </section>

        );

      })}

    </div>

  );

}

