"use client";

import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";

import Editor, {
  type EditorHandle,
  type EditorToolbarTarget,
} from "../editor/Editor";
import {
  convertAnswerToMathMode,
  convertAnswerToTextMode,
  getAnswerPrimaryMathId,
  isAnswerInMathMode,
} from "@/app/lib/answerDocument";
import { EditorDocument } from "../editor/types";

type Props = {
  value: EditorDocument;
  onChange: (document: EditorDocument) => void;
  onActivate?: (target: EditorToolbarTarget) => void;
  variantSeed?: string;
};

const ShortAnswer = forwardRef<EditorHandle, Props>(
  function ShortAnswer(
    { value, onChange, onActivate, variantSeed },
    ref
  ) {
    const mathMode = isAnswerInMathMode(value);
    const [focusMathRevision, setFocusMathRevision] = useState(0);

    const defaultFocusMathNodeId = useMemo(() => {
      if (!mathMode) {
        return null;
      }

      return getAnswerPrimaryMathId(value);
    }, [mathMode, value, focusMathRevision]);

    const switchToTextMode = useCallback(() => {
      onChange(convertAnswerToTextMode(value));
    }, [onChange, value]);

    const switchToMathMode = useCallback(() => {
      onChange(convertAnswerToMathMode(value, variantSeed));
      setFocusMathRevision((revision) => revision + 1);
    }, [onChange, value, variantSeed]);

    return (
      <div className="task-editor-workspace__answer">
        <div className="task-editor-answer__header">
          <h2 className="task-editor-section__title">Odpowiedź</h2>
          {mathMode ? (
            <button
              type="button"
              className="task-editor-answer__mode"
              onClick={switchToTextMode}
              title="Przełącz na zwykły tekst"
            >
              Tekst
            </button>
          ) : (
            <button
              type="button"
              className="task-editor-answer__mode"
              onClick={switchToMathMode}
              title="Przełącz na formułę matematyczną"
            >
              fx
            </button>
          )}
        </div>
        <Editor
          ref={ref}
          sessionId="odpowiedz"
          value={value}
          onChange={onChange}
          hideToolbar
          layout="compact"
          onActivate={onActivate}
          defaultFocusMathNodeId={defaultFocusMathNodeId}
        />
      </div>
    );
  }
);

export default ShortAnswer;
