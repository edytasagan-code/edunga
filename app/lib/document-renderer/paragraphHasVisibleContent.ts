import type { InlineNode } from "@/app/components/editor/types";

export function paragraphHasVisibleContent(
  children: InlineNode[]
): boolean {
  return children.some((node) => {
    if (node.type === "text") {
      return node.text.trim().length > 0;
    }

    if (node.type === "math") {
      return node.latex.trim().length > 0;
    }

    if (node.type === "image") {
      return node.src.trim().length > 0;
    }

    if (node.type === "ink") {
      return node.strokes.length > 0;
    }

    return false;
  });
}
