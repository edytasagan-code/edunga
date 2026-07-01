export type TextNode = {
  id: string;
  type: "text";
  text: string;
};

export type MathNode = {
  id: string;
  type: "math";
  latex: string;
};

export type ImageNode = {
  id: string;
  type: "image";
  src: string;
};

export type NodeModel =
  | TextNode
  | MathNode
  | ImageNode;

export type ParagraphModel = {
  id: string;
  nodes: NodeModel[];
};

export type DocumentModel = {
  paragraphs: ParagraphModel[];
};