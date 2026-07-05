"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import Toolbar from "./Toolbar";
import { MathNode } from "./extensions/MathNode";

import "./styles.css";

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      MathNode,
    ],

    content: "<p></p>",

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class: "edunga-editor",
        spellcheck: "false",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
}