"use client";



import { forwardRef, useState } from "react";



import DocumentOutlinePanel from "../editor/DocumentOutlinePanel";

import Editor, {

  type EditorHandle,

  type EditorToolbarTarget,

} from "../editor/Editor";

import EditorPdfPreview from "../editor/EditorPdfPreview";

import EditorSplitLayout from "../editor/EditorSplitLayout";

import { EditorDocument } from "../editor/types";



type Props = {

  value: EditorDocument;

  onChange: (document: EditorDocument) => void;

  onActivate?: (target: EditorToolbarTarget) => void;

  showPdfPreview?: boolean;

};



const TaskEditor = forwardRef<EditorHandle, Props>(function TaskEditor(

  { value, onChange, onActivate, showPdfPreview = false },

  ref

) {

  const [outlineVisible, setOutlineVisible] = useState(false);

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(

    null

  );



  const editor = (

    <Editor

      ref={ref}

      sessionId="tresc"

      value={value}

      onChange={onChange}

      hideToolbar

      layout="primary"

      onActivate={onActivate}

      showOutline={outlineVisible}

      onOutlineChange={setOutlineVisible}

      onScrollToParagraph={setActiveParagraphId}

    />

  );



  return (

    <div className="task-editor-workspace__primary flex min-h-0 flex-1 flex-col">

      <h2 className="task-editor-section__title">Treść zadania</h2>



      <div className="flex min-h-0 flex-1 flex-col">

        {showPdfPreview ? (

          <EditorSplitLayout

            showOutline={outlineVisible}

            outline={

              <DocumentOutlinePanel

                document={value}

                activeParagraphId={activeParagraphId}

                onSelect={(paragraphId) => {

                  setActiveParagraphId(paragraphId);



                  if (ref && typeof ref === "object" && ref.current) {

                    ref.current.scrollToParagraph(paragraphId);

                  }

                }}

              />

            }

            editor={editor}

            preview={<EditorPdfPreview document={value} />}

          />

        ) : (

          editor

        )}

      </div>

    </div>

  );

});



export default TaskEditor;

