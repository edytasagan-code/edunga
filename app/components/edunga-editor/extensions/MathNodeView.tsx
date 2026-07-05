"use client";

import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";

import MathField from "../MathField";

export default function MathNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="span"
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
      }}
    >
      <MathField
        value={node.attrs.latex}
        onChange={(latex) => {
          updateAttributes({
            latex,
          });
        }}
      />
    </NodeViewWrapper>
  );
}