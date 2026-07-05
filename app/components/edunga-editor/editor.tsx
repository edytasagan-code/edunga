"use client";

import { useEffect } from "react";
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

    onUpdate({ editor }) {
      console.log(
        JSON.stringify(editor.getJSON(), null, 2)
      );
    },
  });

  useEffect(() => {
    if (!editor) return;

    console.log("Editor ready");
  }, [editor]);

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