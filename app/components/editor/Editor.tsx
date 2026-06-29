"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Napisz pierwsze zadanie...</p>",
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-[#1E2128] p-4">
      <EditorContent editor={editor} />
    </div>
  );
}
