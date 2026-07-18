import type { MathAst, SetOperator } from "./ast";

type NumericToken =
  | { type: "integer"; value: string }
  | { type: "decimal"; value: string }
  | {
      type: "repeatingDecimal";
      whole: string;
      separator: "," | ".";
      recurring: string;
    }
  | { type: "mixed"; whole: string; numerator: string; denominator: string };

export class MathParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MathParseError";
  }
}

const GREEK_SYMBOLS: Record<string, string> = {
  π: "pi",
  Π: "Pi",
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  θ: "theta",
  λ: "lambda",
  μ: "mu",
  σ: "sigma",
  φ: "phi",
  ω: "omega",
};

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return /[a-zA-ZπΠαβγδθλμσφω]/.test(char);
}

function isTimesChar(char: string): boolean {
  return char === "·" || char === "∙" || char === "*";
}

function skipWhitespace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index] ?? "")) {
    index += 1;
  }

  return index;
}

function isInfinityMarker(source: string, index: number): boolean {
  const marker = source[index];

  if (marker === "∞") {
    return true;
  }

  return source.slice(index, index + 3).toLowerCase() === "inf";
}

function readInfinity(source: string, start: number): { ast: MathAst; index: number } {
  let index = start;
  let sign: "+" | "-" = "+";

  if (source[index] === "-") {
    sign = "-";
    index += 1;
  } else if (source[index] === "+") {
    index += 1;
  }

  index = skipWhitespace(source, index);

  if (source[index] === "∞") {
    return {
      ast: { kind: "infinity", sign },
      index: index + 1,
    };
  }

  if (source.slice(index, index + 3).toLowerCase() === "inf") {
    return {
      ast: { kind: "infinity", sign },
      index: index + 3,
    };
  }

  throw new MathParseError(`Expected infinity at position ${start}.`);
}

function matchSetOperator(
  source: string,
  index: number
): { operator: SetOperator; index: number } | null {
  const char = source[index] ?? "";

  if (char === "∪") {
    return { operator: "union", index: index + 1 };
  }

  if (char === "∩") {
    return { operator: "intersection", index: index + 1 };
  }

  if (source.slice(index, index + 5).toLowerCase() === "\\cup") {
    return { operator: "union", index: index + 5 };
  }

  if (source.slice(index, index + 5).toLowerCase() === "\\cap") {
    return { operator: "intersection", index: index + 5 };
  }

  return null;
}

function readDigits(source: string, index: number): { value: string; index: number } {
  const start = index;

  while (index < source.length && isDigit(source[index] ?? "")) {
    index += 1;
  }

  return {
    value: source.slice(start, index),
    index,
  };
}

function numericTokenToAst(token: NumericToken): MathAst {
  switch (token.type) {
    case "integer":
      return { kind: "integer", value: token.value };
    case "decimal":
      return { kind: "decimal", value: token.value };
    case "repeatingDecimal":
      return {
        kind: "repeatingDecimal",
        whole: token.whole,
        separator: token.separator,
        recurring: token.recurring,
      };
    case "mixed":
      return {
        kind: "mixed",
        whole: token.whole,
        numerator: token.numerator,
        denominator: token.denominator,
      };
  }
}

function readNumberToken(source: string, start: number): { token: NumericToken; index: number } {
  let index = start;
  let sign = "";

  if (source[index] === "-") {
    sign = "-";
    index += 1;
  } else if (source[index] === "+") {
    index += 1;
  }

  const integer = readDigits(source, index);

  if (!integer.value) {
    throw new MathParseError(`Expected number at position ${start}.`);
  }

  index = integer.index;
  const wholeWithSign = `${sign}${integer.value}`;

  if (source[index] === "," || source[index] === ".") {
    const separator = source[index] as "," | ".";
    const rest = source.slice(index + 1);
    const recurringMatch = rest.match(/^\((\d+)\)/);

    if (recurringMatch) {
      return {
        token: {
          type: "repeatingDecimal",
          whole: wholeWithSign,
          separator,
          recurring: recurringMatch[1],
        },
        index: index + 1 + recurringMatch[0].length,
      };
    }

    if (isDigit(source[index + 1] ?? "")) {
      if (
        separator === "," &&
        (/^\s*\d+\s*\/\d/.test(rest) || /^\s*\d+\s+\d+\/\d/.test(rest))
      ) {
        return {
          token: { type: "integer", value: wholeWithSign },
          index,
        };
      }

      const fraction = readDigits(source, index + 1);

      if (fraction.value && source[fraction.index] !== "/") {
        return {
          token: {
            type: "decimal",
            value: `${wholeWithSign}${separator}${fraction.value}`,
          },
          index: fraction.index,
        };
      }
    }
  }

  const mixedStart = skipWhitespace(source, index);

  if (mixedStart > index) {
    const numerator = readDigits(source, mixedStart);

    if (numerator.value && source[numerator.index] === "/") {
      const denominator = readDigits(source, numerator.index + 1);

      if (denominator.value) {
        return {
          token: {
            type: "mixed",
            whole: wholeWithSign,
            numerator: numerator.value,
            denominator: denominator.value,
          },
          index: denominator.index,
        };
      }
    }
  }

  return {
    token: { type: "integer", value: wholeWithSign },
    index,
  };
}

function readSymbol(source: string, start: number): { ast: MathAst; index: number } {
  const char = source[start] ?? "";

  if (char in GREEK_SYMBOLS) {
    return {
      ast: { kind: "symbol", name: GREEK_SYMBOLS[char] ?? char },
      index: start + 1,
    };
  }

  if (source.slice(start, start + 4).toLowerCase() === "\\pi") {
    return {
      ast: { kind: "symbol", name: "pi" },
      index: start + 4,
    };
  }

  if (/[a-zA-Z]/.test(char)) {
    return {
      ast: { kind: "symbol", name: char },
      index: start + 1,
    };
  }

  throw new MathParseError(`Expected symbol at position ${start}.`);
}

function matchingIntervalClose(open: string): ")" | "]" {
  return open === "[" ? "]" : ")";
}

function isIntervalClose(char: string): char is ")" | "]" {
  return char === ")" || char === "]";
}

function intervalDelimiters(open: "(" | "[", close: ")" | "]"): {
  open: "(" | "[";
  close: ")" | "]";
} {
  return { open, close };
}

function detectSetElementSeparator(source: string, openIndex: number): "," | ";" {
  let depth = 0;

  for (let index = openIndex + 1; index < source.length; index += 1) {
    const char = source[index] ?? "";

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      break;
    }

    if (char === ";" && depth === 0) {
      return ";";
    }
  }

  return ",";
}

function readSetLiteral(
  source: string,
  start: number
): { ast: MathAst; index: number } {
  let index = start + 1;
  const elements: MathAst[] = [];
  const elementSeparator = detectSetElementSeparator(source, start);

  index = skipWhitespace(source, index);

  if (source[index] === "}") {
    return {
      ast: { kind: "set", elements: [] },
      index: index + 1,
    };
  }

  while (index < source.length) {
    const element = readTerm(source, index);
    elements.push(element.ast);
    index = skipWhitespace(source, element.index);

    if (source[index] === "}") {
      return {
        ast: { kind: "set", elements },
        index: index + 1,
      };
    }

    if (source[index] !== elementSeparator) {
      throw new MathParseError(
        elementSeparator === ";"
          ? "Expected semicolon or closing brace in set."
          : "Expected comma or closing brace in set."
      );
    }

    index = skipWhitespace(source, index + 1);
  }

  throw new MathParseError("Unclosed set literal.");
}

function readPrimary(source: string, start: number): { ast: MathAst; index: number } {
  let index = skipWhitespace(source, start);
  const char = source[index] ?? "";

  if (isInfinityMarker(source, index) || char === "+" || char === "-") {
    const next = skipWhitespace(source, index + (char === "+" || char === "-" ? 1 : 0));

    if (isInfinityMarker(source, next)) {
      return readInfinity(source, index);
    }
  }

  if (char === "√") {
    index += 1;
    const value = readUnary(source, index);

    return {
      ast: {
        kind: "sqrt",
        value: value.ast,
      },
      index: value.index,
    };
  }

  if (char === "{") {
    return readSetLiteral(source, index);
  }

  if (char === "(" || char === "[") {
    const open = char;
    const first = parseExpression(source, index + 1);
    let nextIndex = skipWhitespace(source, first.index);

    if (source[nextIndex] === ",") {
      const second = readTerm(source, nextIndex + 1);
      nextIndex = skipWhitespace(source, second.index);

      if (isIntervalClose(source[nextIndex] ?? "")) {
        const close = source[nextIndex] as ")" | "]";

        return {
          ast: {
            kind: "interval",
            left: first.ast,
            right: second.ast,
            ...intervalDelimiters(open, close),
          },
          index: nextIndex + 1,
        };
      }
    }

    const expectedClose = matchingIntervalClose(open);

    if (source[first.index] === expectedClose || source[first.index] === ")") {
      return {
        ast: { kind: "group", value: first.ast },
        index: first.index + 1,
      };
    }

    throw new MathParseError("Expected closing parenthesis.");
  }

  if (char === "+") {
    return readPrimary(source, index + 1);
  }

  if (isDigit(char) || (char === "-" && isDigit(source[index + 1] ?? ""))) {
    const number = readNumberToken(source, index);

    return {
      ast: numericTokenToAst(number.token),
      index: number.index,
    };
  }

  if (isIdentifierStart(char)) {
    return readSymbol(source, index);
  }

  throw new MathParseError(`Unexpected character '${char}' at position ${index}.`);
}

function unwrapNumerator(ast: MathAst): MathAst {
  return ast.kind === "group" ? ast.value : ast;
}

function readUnary(source: string, start: number): { ast: MathAst; index: number } {
  let index = skipWhitespace(source, start);
  const char = source[index] ?? "";

  if (char === "+") {
    return readUnary(source, index + 1);
  }

  if (char === "-") {
    const next = skipWhitespace(source, index + 1);

    if (isInfinityMarker(source, next)) {
      return readInfinity(source, index);
    }

    if (isDigit(source[next] ?? "")) {
      return readPrimary(source, index);
    }

    const value = readUnary(source, index + 1);

    return {
      ast: {
        kind: "unary",
        operator: "-",
        value: value.ast,
      },
      index: value.index,
    };
  }

  return readPrimary(source, index);
}

function readFraction(source: string, start: number): { ast: MathAst; index: number } {
  let current = readUnary(source, start);
  let index = skipWhitespace(source, current.index);

  while (source[index] === "/") {
    const denominator = readUnary(source, index + 1);

    current = {
      ast: {
        kind: "fraction",
        numerator: unwrapNumerator(current.ast),
        denominator: unwrapNumerator(denominator.ast),
      },
      index: denominator.index,
    };
    index = skipWhitespace(source, current.index);
  }

  return current;
}

function canStartImplicitFactor(source: string, index: number): boolean {
  const char = source[index] ?? "";

  if (!char) {
    return false;
  }

  if (isTimesChar(char) || char === "√" || char === "(" || char === "[" || char === "{") {
    return true;
  }

  if (isDigit(char) || isIdentifierStart(char)) {
    return true;
  }

  return false;
}

function readFactor(source: string, start: number): { ast: MathAst; index: number } {
  let current = readFraction(source, start);
  let index = current.index;

  while (true) {
    index = skipWhitespace(source, index);

    if (!canStartImplicitFactor(source, index)) {
      break;
    }

    const char = source[index] ?? "";

    if (char === "+" || char === "-" || char === "/" || char === ",") {
      break;
    }

    if (isTimesChar(char)) {
      const right = readFraction(source, index + 1);
      current = {
        ast: {
          kind: "binary",
          operator: "·",
          left: current.ast,
          right: right.ast,
        },
        index: right.index,
      };
      index = current.index;
      continue;
    }

    const right = readFraction(source, index);
    current = {
      ast: {
        kind: "binary",
        operator: "·",
        left: current.ast,
        right: right.ast,
      },
      index: right.index,
    };
    index = current.index;
  }

  return current;
}

function readTerm(source: string, start: number): { ast: MathAst; index: number } {
  return readFactor(source, start);
}

function parseExpression(source: string, start: number): { ast: MathAst; index: number } {
  let current = readTerm(source, start);
  let index = current.index;

  while (true) {
    index = skipWhitespace(source, index);
    const char = source[index] ?? "";

    if (char !== "+" && char !== "-") {
      break;
    }

    const operator = char === "+" ? "+" : "-";
    const right = readTerm(source, index + 1);
    current = {
      ast: {
        kind: "binary",
        operator,
        left: current.ast,
        right: right.ast,
      },
      index: right.index,
    };
    index = current.index;
  }

  return current;
}

function parseSetExpression(source: string, start: number): { ast: MathAst; index: number } {
  let current = parseExpression(source, start);
  let index = current.index;

  while (true) {
    index = skipWhitespace(source, index);
    const operator = matchSetOperator(source, index);

    if (!operator) {
      break;
    }

    const right = parseExpression(source, operator.index);
    current = {
      ast: {
        kind: "setOp",
        operator: operator.operator,
        left: current.ast,
        right: right.ast,
      },
      index: right.index,
    };
    index = current.index;
  }

  return current;
}

export function preprocessComplexFractionNotation(source: string): string {
  const trimmed = source.trim();

  if (!trimmed.includes("/")) {
    return trimmed;
  }

  if (/^\([^)]+\)\s*\//.test(trimmed)) {
    return trimmed;
  }

  const slashIndex = trimmed.lastIndexOf("/");

  if (slashIndex <= 0) {
    return trimmed;
  }

  const numerator = trimmed.slice(0, slashIndex).trim();
  const denominator = trimmed.slice(slashIndex + 1).trim();

  if (/^\([^)]*,/.test(numerator)) {
    return trimmed;
  }

  if (numerator.includes("/")) {
    return trimmed;
  }

  if (!/[+\-−]/.test(numerator.slice(1))) {
    return trimmed;
  }

  if (!/^[\d()+√\s+\-−,a-zA-ZπΠαβγδθλμσφω{}]+$/u.test(denominator)) {
    return trimmed;
  }

  return `(${numerator})/${denominator}`;
}

export function parseMathNotation(source: string): MathAst {
  const normalized = preprocessComplexFractionNotation(
    source.trim().replace(/\u2212/g, "-")
  );

  if (!normalized) {
    throw new MathParseError("Empty expression.");
  }

  const parsed = parseSetExpression(normalized, 0);
  const trailing = skipWhitespace(normalized, parsed.index);

  if (trailing !== normalized.length) {
    throw new MathParseError(
      `Unexpected trailing input at position ${trailing}: '${normalized.slice(trailing)}'.`
    );
  }

  return parsed.ast;
}
