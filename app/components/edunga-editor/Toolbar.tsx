"use client";

import { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

type ToolbarButtonProps = {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

function ToolbarButton({
  children,
  active = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`
        h-9
        min-w-9
        px-3
        rounded-md
        border
        text-sm
        transition-colors
        ${
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white hover:bg-zinc-100 border-zinc-300"
        }
      `}
    >
      {children}
    </button>
  );
}

function Separator() {
  return (
    <div className="mx-1 h-6 w-px bg-zinc-300" />
  );
}

export default function Toolbar({
  editor,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b bg-zinc-50 p-2">

      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() =>
          editor.chain().focus().toggleBold().run()
        }
      >
        <b>B</b>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() =>
          editor.chain().focus().toggleItalic().run()
        }
      >
        <i>I</i>
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() =>
          editor.commands.insertMath()
        }
      >
        fx
      </ToolbarButton>

      <Separator />

      <ToolbarButton onClick={() => {}}>
        √
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        a/b
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        x²
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        xⁿ
      </ToolbarButton>

      <Separator />

      <ToolbarButton onClick={() => {}}>
        π
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        ≤
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        ≥
      </ToolbarButton>

      <ToolbarButton onClick={() => {}}>
        ≠
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().undo().run()
        }
      >
        ↶
      </ToolbarButton>

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().redo().run()
        }
      >
        ↷
      </ToolbarButton>

    </div>
  );
}