"use client";

import { forwardRef } from "react";

import Editor, {
  type EditorHandle,
  type EditorToolbarTarget,
} from "../editor/Editor";
import { EditorDocument } from "../editor/types";

type Props = {
  value: EditorDocument;
  onChange: (document: EditorDocument) => void;
  onActivate?: (target: EditorToolbarTarget) => void;
};

const ShortAnswer = forwardRef<EditorHandle, Props>(
  function ShortAnswer(
    { value, onChange, onActivate },
    ref
  ) {
    return (
      <div className="task-editor-workspace__answer">
        <h2 className="task-editor-section__title">
          Odpowiedź
        </h2>
        <Editor
          ref={ref}
          sessionId="odpowiedz"
          value={value}
          onChange={onChange}
          hideToolbar
          layout="compact"
          onActivate={onActivate}
        />
      </div>
    );
  }
);

export default ShortAnswer;
