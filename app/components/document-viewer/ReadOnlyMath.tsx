"use client";

import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

import { latexForReadOnlyDisplay } from "@/app/lib/math/sanitizeMathLatex";

type Props = {
  latex: string;
};

export default function ReadOnlyMath({ latex }: Props) {
  const displayLatex = latexForReadOnlyDisplay(latex);

  if (!displayLatex) {
    return null;
  }

  return (
    <span
      className="inline align-baseline"
      data-node-type="math"
    >
      <InlineMath>{displayLatex}</InlineMath>
    </span>
  );
}
