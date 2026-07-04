import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import MathNodeView from "./MathNodeView";

export const MathNode = Node.create({
  name: "math",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

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
        tag: "math-inline",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "math-inline",
      HTMLAttributes,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      MathNodeView
    );
  },
});