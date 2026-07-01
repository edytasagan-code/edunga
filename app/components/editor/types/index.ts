export const DOCUMENT_VERSION = 1;

export type NodeType =
  | "text"
  | "math"
  | "image"
  | "ink"
  | "graph";

export interface BaseNode {
  id: string;
  type: NodeType;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
}

export interface MathNode extends BaseNode {
  type: "math";
  latex: string;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface InkNode extends BaseNode {
  type: "ink";
  strokes: unknown[];
}

export interface GraphNode extends BaseNode {
  type: "graph";
  expression: string;
}

export type InlineNode =
  | TextNode
  | MathNode
  | ImageNode
  | InkNode
  | GraphNode;

export interface Paragraph {
  id: string;
  children: InlineNode[];
}

export interface EditorDocument {
  version: number;
  paragraphs: Paragraph[];
}

export interface Position {
  paragraphId: string;
  nodeId: string;
  offset: number;
}

export interface Selection {
  anchor: Position;
  focus: Position;
}
export interface EditorChangeEvent {
  document: EditorDocument;
  selection: Selection | null;
}