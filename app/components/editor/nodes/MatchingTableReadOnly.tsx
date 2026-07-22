"use client";

import type { ReactNode } from "react";

import { mapInlineNodes } from "@/app/lib/document-renderer/mapInlineNodes";
import type { MatchingTableNode, MathNode, TextNode } from "../types";
import MatchingTableView from "./MatchingTableView";

type Props = {
  node: MatchingTableNode;
  renderText: (node: TextNode) => ReactNode;
  renderMath: (node: MathNode) => ReactNode;
};

export default function MatchingTableReadOnly({
  node,
  renderText,
  renderMath,
}: Props) {
  return (
    <MatchingTableView
      node={node}
      renderLeft={(rowId, _children, rowIndex) => {
        const row = node.rows[rowIndex];

        if (!row) {
          return null;
        }

        return (
          <span key={rowId}>
            {mapInlineNodes(row.left, {
              text: renderText,
              math: renderMath,
            })}
          </span>
        );
      }}
    />
  );
}
