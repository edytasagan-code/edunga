"use client";

import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

type Props = {
  value: unknown;
};

export default function MathViewer({ value }: Props) {
  if (!value) return null;

  // zwykły tekst
  if (typeof value === "string") {
    return (
      <div className="whitespace-pre-wrap break-words text-white">
        {renderLatex(value)}
      </div>
    );
  }

  // JSON z edytora
  if (typeof value === "object") {
    return (
      <div className="whitespace-pre-wrap break-words text-white">
        {renderLatex(JSON.stringify(value))}
      </div>
    );
  }

  return null;
}

function renderLatex(text: string) {
  const regex = /\\\((.*?)\\\)|\$\$(.*?)\$\$/g;

  const out: React.ReactNode[] = [];

  let last = 0;

  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      out.push(text.slice(last, match.index));
    }

    out.push(
      match[1] ? (
        <InlineMath key={match.index}>
          {match[1]}
        </InlineMath>
      ) : (
        <BlockMath key={match.index}>
          {match[2]}
        </BlockMath>
      )
    );

    last = regex.lastIndex;
  }

  if (last < text.length) {
    out.push(text.slice(last));
  }

  return out;
}
