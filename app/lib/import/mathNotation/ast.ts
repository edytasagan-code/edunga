export type BinaryOperator = "+" | "-" | "·" | "*";

export type SetOperator = "union" | "intersection";

export type MathAst =
  | IntegerNode
  | DecimalNode
  | RepeatingDecimalNode
  | MixedNumberNode
  | FractionNode
  | SqrtNode
  | SymbolNode
  | SetNode
  | UnaryNode
  | BinaryNode
  | GroupNode
  | IntervalNode
  | InfinityNode
  | SetOperationNode;

export type SymbolNode = {
  kind: "symbol";
  name: string;
};

export type SetNode = {
  kind: "set";
  elements: MathAst[];
};

export type InfinityNode = {
  kind: "infinity";
  sign: "+" | "-";
};

export type SetOperationNode = {
  kind: "setOp";
  operator: SetOperator;
  left: MathAst;
  right: MathAst;
};

export type IntervalNode = {
  kind: "interval";
  left: MathAst;
  right: MathAst;
  open: "(" | "[";
  close: ")" | "]";
};

export type IntegerNode = {
  kind: "integer";
  value: string;
};

export type DecimalNode = {
  kind: "decimal";
  value: string;
};

export type RepeatingDecimalNode = {
  kind: "repeatingDecimal";
  whole: string;
  separator: "," | ".";
  recurring: string;
};

export type MixedNumberNode = {
  kind: "mixed";
  whole: string;
  numerator: string;
  denominator: string;
};

export type FractionNode = {
  kind: "fraction";
  numerator: MathAst;
  denominator: MathAst;
};

export type SqrtNode = {
  kind: "sqrt";
  value: MathAst;
};

export type UnaryNode = {
  kind: "unary";
  operator: "-";
  value: MathAst;
};

export type BinaryNode = {
  kind: "binary";
  operator: BinaryOperator;
  left: MathAst;
  right: MathAst;
};

export type GroupNode = {
  kind: "group";
  value: MathAst;
};
