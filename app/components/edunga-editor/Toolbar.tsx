"use client";

import { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

export default function Toolbar({ editor }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 12,
        background: "#2b2b2b",
      }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>

      <div
        style={{
          width: 1,
          height: 24,
          background: "#555",
          marginInline: 4,
        }}
      />

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.commands.insertMath()}
      >
        fx
      </button>
    </div>
  );
}