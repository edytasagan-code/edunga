import type { ReactNode } from "react";

import type {
  EditorDocument,
  MathNode,
  Paragraph,
  TextNode,
} from "@/app/components/editor/types";

/** Leaf renderers for a single output target (browser, PDF, DOCX, …). */
export type DocumentLeafRenderers<TNode> = {
  renderText: (node: TextNode) => TNode;
  renderMath: (node: MathNode) => TNode;
};

export type DocumentParagraphRenderProps<TNode> = {
  paragraph: Paragraph;
  index: number;
  isFirst: boolean;
  children: TNode[];
};

export type DocumentRendererProps<TNode> = {
  document: EditorDocument;
} & DocumentLeafRenderers<TNode> & {
    renderParagraph: (
      props: DocumentParagraphRenderProps<TNode>
    ) => ReactNode;
  };

export type { EditorDocumentRendererProps } from "./EditorDocumentRenderer";
export { EditorDocumentRenderer } from "./EditorDocumentRenderer";
