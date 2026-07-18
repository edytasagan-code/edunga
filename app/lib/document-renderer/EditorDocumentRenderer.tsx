import type { ReactNode } from "react";

import type {
  EditorDocument,
  ImageNode,
  InkNode,
  MathNode,
  Paragraph,
  TextNode,
} from "@/app/components/editor/types";

import { mapInlineNodes } from "./mapInlineNodes";

export type EditorDocumentRendererProps = {
  document: EditorDocument;
  renderText: (node: TextNode) => ReactNode;
  renderMath: (node: MathNode) => ReactNode;
  renderImage?: (node: ImageNode) => ReactNode;
  renderInk?: (node: InkNode) => ReactNode;
  renderParagraph: (props: {
    paragraph: Paragraph;
    index: number;
    isFirst: boolean;
    children: ReactNode[];
  }) => ReactNode;
};

export function EditorDocumentRenderer({
  document,
  renderText,
  renderMath,
  renderImage,
  renderInk,
  renderParagraph,
}: EditorDocumentRendererProps) {
  return (
    <>
      {document.paragraphs.map((paragraph, index) =>
        renderParagraph({
          paragraph,
          index,
          isFirst: index === 0,
          children: mapInlineNodes(paragraph.children, {
            text: renderText,
            math: renderMath,
            image: renderImage,
            ink: renderInk,
          }),
        })
      )}
    </>
  );
}
