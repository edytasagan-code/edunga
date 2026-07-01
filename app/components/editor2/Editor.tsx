"use client";

import { useEffect, useState } from "react";
import { createDocument } from "./document";
import { DocumentModel } from "./types";

type Props = {
  value?: DocumentModel;
  onChange?: (document: DocumentModel) => void;
};

export default function Editor({
  value,
  onChange,
}: Props) {
  const [document, setDocument] = useState<DocumentModel>(
    value ?? createDocument()
  );

  useEffect(() => {
    onChange?.(document);
  }, [document, onChange]);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900">

      <div className="border-b border-zinc-700 p-3 text-white font-bold">
        NOWY ENGINE
      </div>

      <div className="min-h-[300px] p-6 text-white">
        {document.paragraphs.map((paragraph) => (
          <div key={paragraph.id} className="mb-2">
     {paragraph.nodes.map((node) => {

  if (node.type === "text") {
    return (
      <span key={node.id}>
        {node.text || "Start typing..."}
      </span>
    );
  }

  if (node.type === "math") {
    return (
      <span
        key={node.id}
        className="mx-1 rounded bg-yellow-400 px-2 py-1 text-black"
      >
        {node.latex || "□"}
      </span>
    );
  }

  return null;

})}
          </div>
        ))}
      </div>

    </div>
  );
}