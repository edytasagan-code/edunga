"use client";

import { NodeViewWrapper } from "@tiptap/react";

import "mathlive";

export default function MathNodeView() {
  return (
    <NodeViewWrapper
      as="span"
      style={{
        display: "inline-block",
      }}
    >
      <math-field
        style={{
          minWidth: "60px",
          border: "none",
          outline: "none",
          fontSize: "28px",
        }}
      />
    </NodeViewWrapper>
  );
}