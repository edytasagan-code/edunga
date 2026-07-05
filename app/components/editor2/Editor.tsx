"use client";

import { useEffect } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { MathNode } from "./MathNode";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function Editor({
  value = "<p></p>",
  onChange,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      MathNode,
    ],

    content: value,

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class:
          "min-h-[350px] p-6 outline-none text-lg text-white",
      },
    },

    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900">

      <div className="flex gap-2 border-b border-zinc-700 bg-zinc-800 p-2">

        <button
          className="rounded bg-zinc-700 px-3 py-2 hover:bg-zinc-600"
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          B
        </button>

        <button
          className="rounded bg-zinc-700 px-3 py-2 hover:bg-zinc-600"
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          I
        </button>

        <button
          className="rounded bg-blue-600 px-3 py-2 hover:bg-blue-500"
          onClick={() =>
            editor.chain().focus().insertMath().run()
          }
        >
          fx
        </button>

      </div>

      <EditorContent editor={editor} />

    </div>
  );
}