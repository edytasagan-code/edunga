export const DOCUMENT_VERSION = 1;

export type NodeType =
  | "text"
  | "math"
  | "image"
  | "ink"
  | "graph"
  | "table"
  | "true-false-table"
  | "matching-table";

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

export type ImageAlign = "left" | "center" | "right";

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  width: number;
  height: number;
  alt: string;
  align?: ImageAlign;
}

export type InkPoint = {
  x: number;
  y: number;
};

export type InkStroke = {
  points: InkPoint[];
  color: string;
  width: number;
};

export interface InkNode extends BaseNode {
  type: "ink";
  width: number;
  height: number;
  strokes: InkStroke[];
  align?: ImageAlign;
}

export interface GraphNode extends BaseNode {
  type: "graph";
  expression: string;
}

export interface TrueFalseTableRow {
  id: string;
  label?: string;
  statement: InlineNode[];
}

export interface TableNode extends BaseNode {
  type: "table";
  headers?: string[];
  rows: string[][];
}

export interface TrueFalseTableNode extends BaseNode {
  type: "true-false-table";
  layout: "cke-prawda-falsz";
  rows: TrueFalseTableRow[];
}

export interface MatchingTableRow {
  id: string;
  label?: string;
  left: InlineNode[];
}

export interface MatchingTableOption {
  label: string;
  text: string;
}

export interface MatchingTableNode extends BaseNode {
  type: "matching-table";
  layout: "cke-dopasuj";
  options: MatchingTableOption[];
  rows: MatchingTableRow[];
}

export type InlineNode =
  | TextNode
  | MathNode
  | ImageNode
  | InkNode
  | GraphNode
  | TableNode
  | TrueFalseTableNode
  | MatchingTableNode;

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