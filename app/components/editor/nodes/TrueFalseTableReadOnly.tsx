"use client";

import type { ReactNode } from "react";

import { mapInlineNodes } from "@/app/lib/document-renderer/mapInlineNodes";
import type {
  MathNode,
  TextNode,
  TrueFalseTableNode,
} from "../types";
import TrueFalseTableView from "./TrueFalseTableView";

type Props = {
  node: TrueFalseTableNode;
  renderText: (node: TextNode) => ReactNode;
  renderMath: (node: MathNode) => ReactNode;
};

export default function TrueFalseTableReadOnly({
  node,
  renderText,
  renderMath,
}: Props) {
  return (
    <TrueFalseTableView
      node={node}
      renderStatement={(rowId, _children, rowIndex) => {
        const row = node.rows[rowIndex];

        if (!row) {
          return null;
        }

        return (
          <span key={rowId}>
            {mapInlineNodes(row.statement, {
              text: renderText,
              math: renderMath,
            })}
          </span>
        );
      }}
    />
  );
}
