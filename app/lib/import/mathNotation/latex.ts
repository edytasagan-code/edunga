import type { BinaryOperator, MathAst } from "./ast";

function formatDecimal(value: string): string {
  return value.replace(/,/g, "{,}");
}

function renderInteger(node: Extract<MathAst, { kind: "integer" }>): string {
  return node.value;
}

function renderDecimal(node: Extract<MathAst, { kind: "decimal" }>): string {
  return formatDecimal(node.value);
}

function renderRepeatingDecimal(
  node: Extract<MathAst, { kind: "repeatingDecimal" }>
): string {
  const separator = node.separator === "," ? "{,}" : ".";

  return `${node.whole}${separator}\\overline{${node.recurring}}`;
}

function renderMixed(node: Extract<MathAst, { kind: "mixed" }>): string {
  return `${node.whole}\\,\\frac{${node.numerator}}{${node.denominator}}`;
}

function renderFraction(node: Extract<MathAst, { kind: "fraction" }>): string {
  return `\\frac{${mathAstToLatex(node.numerator)}}{${mathAstToLatex(node.denominator)}}`;
}

function renderSqrt(node: Extract<MathAst, { kind: "sqrt" }>): string {
  return `\\sqrt{${mathAstToLatex(node.value)}}`;
}

function renderUnary(node: Extract<MathAst, { kind: "unary" }>): string {
  return `-${mathAstToLatex(node.value)}`;
}

function renderBinary(node: Extract<MathAst, { kind: "binary" }>): string {
  const left = mathAstToLatex(node.left);
  const right = mathAstToLatex(node.right);

  if (
    (node.operator === "·" || node.operator === "*") &&
    node.right.kind === "sqrt" &&
    (node.left.kind === "integer" || node.left.kind === "decimal")
  ) {
    return `${left}${right}`;
  }

  const operator = binaryOperatorToLatex(node.operator);

  return `${left} ${operator} ${right}`;
}

function renderInfinity(node: Extract<MathAst, { kind: "infinity" }>): string {
  if (node.sign === "-") {
    return "-\\infty";
  }

  return "+\\infty";
}

function renderSetOperation(
  node: Extract<MathAst, { kind: "setOp" }>
): string {
  const operator = node.operator === "union" ? "\\cup" : "\\cap";

  return `${mathAstToLatex(node.left)} ${operator} ${mathAstToLatex(node.right)}`;
}

function groupNeedsParens(value: MathAst): boolean {
  switch (value.kind) {
    case "integer":
    case "decimal":
    case "repeatingDecimal":
    case "mixed":
    case "fraction":
    case "symbol":
      return false;
    case "infinity":
      return false;
    case "set":
      return true;
    case "sqrt":
      return false;
    case "unary":
      return value.value.kind === "sqrt" || value.value.kind === "binary";
    case "binary":
      return true;
    case "group":
      return groupNeedsParens(value.value);
    case "interval":
      return true;
    case "setOp":
      return true;
  }
}

function renderSymbol(node: Extract<MathAst, { kind: "symbol" }>): string {
  switch (node.name) {
    case "pi":
      return "\\pi";
    case "alpha":
      return "\\alpha";
    case "beta":
      return "\\beta";
    case "gamma":
      return "\\gamma";
    case "delta":
      return "\\delta";
    case "theta":
      return "\\theta";
    case "lambda":
      return "\\lambda";
    case "mu":
      return "\\mu";
    case "sigma":
      return "\\sigma";
    case "phi":
      return "\\phi";
    case "omega":
      return "\\omega";
    default:
      return node.name;
  }
}

function renderSet(node: Extract<MathAst, { kind: "set" }>): string {
  const elements = node.elements.map((element) => mathAstToLatex(element)).join(",\\,");

  return `\\left\\{${elements}\\right\\}`;
}

function intervalDelimiter(value: "(" | "[" | ")" | "]"): string {
  switch (value) {
    case "(":
      return "\\left(";
    case "[":
      return "\\left[";
    case ")":
      return "\\right)";
    case "]":
      return "\\right]";
  }
}

function renderInterval(node: Extract<MathAst, { kind: "interval" }>): string {
  return `${intervalDelimiter(node.open)}${mathAstToLatex(node.left)},\\,${mathAstToLatex(node.right)}${intervalDelimiter(node.close)}`;
}

function renderGroup(node: Extract<MathAst, { kind: "group" }>): string {
  const inner = mathAstToLatex(node.value);

  if (!groupNeedsParens(node.value)) {
    return inner;
  }

  return `(${inner})`;
}

function binaryOperatorToLatex(operator: BinaryOperator): string {
  switch (operator) {
    case "+":
      return "+";
    case "-":
      return "-";
    case "·":
    case "*":
      return "\\cdot";
  }
}

export function mathAstToLatex(node: MathAst): string {
  switch (node.kind) {
    case "integer":
      return renderInteger(node);
    case "decimal":
      return renderDecimal(node);
    case "repeatingDecimal":
      return renderRepeatingDecimal(node);
    case "mixed":
      return renderMixed(node);
    case "fraction":
      return renderFraction(node);
    case "symbol":
      return renderSymbol(node);
    case "set":
      return renderSet(node);
    case "sqrt":
      return renderSqrt(node);
    case "unary":
      return renderUnary(node);
    case "binary":
      return renderBinary(node);
    case "group":
      return renderGroup(node);
    case "interval":
      return renderInterval(node);
    case "infinity":
      return renderInfinity(node);
    case "setOp":
      return renderSetOperation(node);
  }
}
