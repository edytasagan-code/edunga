import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import MathNodeView from "./MathNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      insertMath: () => ReturnType;
    };
  }
}

export const MathNode = Node.create({
  name: "math",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

  draggable: false,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "math-node",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "math-node",
      mergeAttributes(HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addCommands() {
    return {
      insertMath:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              latex: "",
            },
          });
        },
    };
  },
});