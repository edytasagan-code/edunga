"use client";

import { getActiveMathField } from "./core/mathEditor";

type Props = {
  onInsertMath: () => void;
};

export default function MathToolbar({
  onInsertMath,
}: Props) {
  function run(command: string) {
    const mf = getActiveMathField();

    if (!mf) {
      onInsertMath();
      return;
    }

    mf.executeCommand(command);
    mf.focus();
  }

  return (
    <div className="flex gap-2 border-b border-zinc-700 p-2">
      <button onClick={() => run("insertFraction")}>
        a/b
      </button>

      <button onClick={() => run("insertSquareRoot")}>
        √
      </button>

      <button onClick={() => run("insertSuperscript")}>
        x²
      </button>

      <button
        onClick={() => {
          const mf = getActiveMathField();

          if (!mf) {
            onInsertMath();
            return;
          }

          mf.insert("\\log_{#?}\\left(#?\\right)");
          mf.focus();
        }}
      >
        log
      </button>

      <button onClick={() => run("insertParentheses")}>
        ( )
      </button>
    </div>
  );
}
