import { mathAstToLatex } from "./mathNotation/latex";
import { MathParseError, parseMathNotation } from "./mathNotation/parse";

/**
 * Converts Vision-style mathematical notation into LaTeX via parse → AST → render.
 */
export function visionExpressionToLatex(expression: string): string {
  const normalized = expression.trim();

  if (!normalized) {
    return "";
  }

  try {
    return mathAstToLatex(parseMathNotation(normalized));
  } catch (error) {
    if (error instanceof MathParseError) {
      console.warn(`Math notation parse failed: ${error.message}`, normalized);
    } else {
      console.warn("Math notation parse failed:", error);
    }

    return normalized;
  }
}

export function visionValueToLatex(value: string): string {
  return visionExpressionToLatex(value);
}
