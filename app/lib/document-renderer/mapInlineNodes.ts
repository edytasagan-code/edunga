import type {
  ImageNode,
  InkNode,
  InlineNode,
  MathNode,
  TextNode,
  TrueFalseTableNode,
} from "@/app/components/editor/types";

export type InlineNodeRenderers<T> = {
  text: (node: TextNode) => T;
  math: (node: MathNode) => T;
  image?: (node: ImageNode) => T;
  ink?: (node: InkNode) => T;
  trueFalseTable?: (node: TrueFalseTableNode) => T;
};

export function mapInlineNodes<T>(
  children: InlineNode[],
  renderers: InlineNodeRenderers<T>
): T[] {
  return children
    .map((node) => {
      if (node.type === "text") {
        if (!node.text) {
          return null;
        }

        return renderers.text(node);
      }

      if (node.type === "math") {
        return renderers.math(node);
      }

      if (node.type === "image" && renderers.image) {
        return renderers.image(node);
      }

      if (node.type === "ink" && renderers.ink) {
        return renderers.ink(node);
      }

      if (node.type === "true-false-table" && renderers.trueFalseTable) {
        return renderers.trueFalseTable(node);
      }

      return null;
    })
    .filter((node): node is T => node != null);
}
