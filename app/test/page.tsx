"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MathNode } from "./MathNode";

export default function Page() {
  const editor = useEditor({
    extensions: [
    StarterKit,
    MathNode,
],
    content: "<p>Oblicz wartość wyrażenia </p>",
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <main className="p-10">

      <div className="mb-4 flex gap-2">

        <button
  onClick={() => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "math",
      })
      .run();
  }}
>
  fx
</button>
      </div>

      <EditorContent
        editor={editor}
        className="rounded border p-4 text-2xl"
      />

    </main>
  );
}
