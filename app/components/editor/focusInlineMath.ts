import type { MathfieldElement } from "mathlive";

import { focusMathField } from "./commands";

export function focusInlineMathNode(
  paragraphId: string,
  nodeId: string,
  side: "start" | "end",
  root?: ParentNode | null
): boolean {
  const scope = root ?? document;
  const field = scope.querySelector(
    `[data-paragraph-id="${paragraphId}"] [data-node-id="${nodeId}"] math-field`
  ) as MathfieldElement | null;

  if (!field) {
    return false;
  }

  focusMathField(field);

  if (side === "start") {
    field.position = 0;
  } else {
    field.position = field.lastOffset;
  }

  return true;
}
