/**
 * MathLive represents editable slots as `\placeholder{...}` in LaTeX export.
 * Those commands are invalid in KaTeX and must not appear in read-only views.
 */
const PLACEHOLDER_PATTERN =
  /\\placeholder(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

/** KaTeX-safe blank for empty fill-in slots in read-only preview. */
const READ_ONLY_PLACEHOLDER = "\\square";

export function stripMathPlaceholderCommands(
  latex: string
): string {
  let result = latex;

  for (let pass = 0; pass < 8; pass += 1) {
    const next = result.replace(
      PLACEHOLDER_PATTERN,
      (_match, body: string) => body
    );

    if (next === result) {
      break;
    }

    result = next;
  }

  return result.replace(/\\placeholder\b/g, "");
}

function mapPlaceholdersForReadOnlyDisplay(latex: string): string {
  let result = latex;

  for (let pass = 0; pass < 8; pass += 1) {
    const next = result.replace(
      PLACEHOLDER_PATTERN,
      (_match, body: string) =>
        body.trim().length > 0 ? body : READ_ONLY_PLACEHOLDER
    );

    if (next === result) {
      break;
    }

    result = next;
  }

  return result.replace(/\\placeholder\b/g, READ_ONLY_PLACEHOLDER);
}

export function latexForReadOnlyDisplay(
  latex: string
): string {
  return mapPlaceholdersForReadOnlyDisplay(latex.trim());
}
