/**
 * Post-process CoMER LaTeX for common math constructs before MathLive insertion.
 * Keeps output editable — only structural/spacing fixes, no UI changes.
 */

const GREEK_FIXES: Record<string, string> = {
  "\\alpha": "\\alpha",
  "\\beta": "\\beta",
  "\\gamma": "\\gamma",
  "\\delta": "\\delta",
  "\\epsilon": "\\epsilon",
  "\\varepsilon": "\\varepsilon",
  "\\zeta": "\\zeta",
  "\\eta": "\\eta",
  "\\theta": "\\theta",
  "\\vartheta": "\\vartheta",
  "\\iota": "\\iota",
  "\\kappa": "\\kappa",
  "\\lambda": "\\lambda",
  "\\mu": "\\mu",
  "\\nu": "\\nu",
  "\\xi": "\\xi",
  "\\pi": "\\pi",
  "\\varpi": "\\varpi",
  "\\rho": "\\rho",
  "\\varrho": "\\varrho",
  "\\sigma": "\\sigma",
  "\\varsigma": "\\varsigma",
  "\\tau": "\\tau",
  "\\upsilon": "\\upsilon",
  "\\phi": "\\phi",
  "\\varphi": "\\varphi",
  "\\chi": "\\chi",
  "\\psi": "\\psi",
  "\\omega": "\\omega",
  "\\Gamma": "\\Gamma",
  "\\Delta": "\\Delta",
  "\\Theta": "\\Theta",
  "\\Lambda": "\\Lambda",
  "\\Xi": "\\Xi",
  "\\Pi": "\\Pi",
  "\\Sigma": "\\Sigma",
  "\\Upsilon": "\\Upsilon",
  "\\Phi": "\\Phi",
  "\\Psi": "\\Psi",
  "\\Omega": "\\Omega",
};

const TRIG_COMMANDS = [
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "det",
  "gcd",
  "lcm",
  "min",
  "max",
];

/** CoMER sometimes splits `\sin` into `\ s i n` or `sin` without backslash. */
function fixTrigAndGreek(latex: string): string {
  let result = latex;

  for (const cmd of TRIG_COMMANDS) {
    const bare = new RegExp(`(?<![\\\\a-zA-Z])${cmd}(?![a-zA-Z])`, "g");
    result = result.replace(bare, `\\${cmd}`);
    result = result.replace(
      new RegExp(`\\\\\\s*${cmd.split("").join("\\s*")}`, "gi"),
      `\\${cmd}`
    );
  }

  for (const [canonical] of Object.entries(GREEK_FIXES)) {
    const name = canonical.slice(1);
    result = result.replace(
      new RegExp(`\\\\\\s*${name.split("").join("\\s*")}`, "gi"),
      canonical
    );
  }

  return result;
}

/** Ensure `\lim`, `\sum`, `\prod`, `\int` have sensible sub/superscript grouping. */
function fixLimitsAndOperators(latex: string): string {
  let result = latex;

  result = result.replace(
    /\\lim\s*(?:_\{([^}]*)\})?\s*(?:\^\{([^}]*)\})?/g,
    (_, sub, sup) => {
      let out = "\\lim";
      if (sub) out += `_{${sub}}`;
      if (sup) out += `^{${sup}}`;
      return out;
    }
  );

  result = result.replace(
    /\\(sum|prod|int)\s*(?:_\{([^}]*)\})?\s*(?:\^\{([^}]*)\})?/g,
    (_, op, sub, sup) => {
      let out = `\\${op}`;
      if (sub) out += `_{${sub}}`;
      if (sup) out += `^{${sup}}`;
      return out;
    }
  );

  result = result.replace(/\\int\s*\\limits/g, "\\int\\limits");

  return result;
}

function fixNestedFractions(latex: string): string {
  let result = latex;
  let previous = "";

  while (previous !== result) {
    previous = result;
    result = result.replace(
      /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      "\\frac{$1}{$2}"
    );
    result = result.replace(
      /\\frac\s+([^{\s\\][^\s]*)\s+([^{\s\\][^\s]*)/g,
      "\\frac{$1}{$2}"
    );
  }

  return result;
}

/** Repair `\sqrt x` → `\sqrt{x}` and nested `\sqrt`. */
function fixRoots(latex: string): string {
  let result = latex;

  result = result.replace(/\\sqrt\s*\{([^{}]*)\}/g, "\\sqrt{$1}");

  result = result.replace(
    /\\sqrt\s+([^{\s\\][^\s]*)/g,
    "\\sqrt{$1}"
  );

  return result;
}

/** Strip spurious `\limits` on trig functions. */
function stripInvalidLimits(latex: string): string {
  return latex.replace(
    /\\(sin|cos|tan|cot|sec|csc|log|ln)\s*\\limits/g,
    "\\$1"
  );
}

/** CoMER puts a trailing variable both in the numerator and after \frac — keep it outside. */
function fixDuplicateVariableAfterFraction(latex: string): string {
  let result = latex.replace(/\s+/g, " ");
  let previous = "";

  while (previous !== result) {
    previous = result;
    // \frac{2 y}{5}y  →  \frac{2}{5}y
    result = result.replace(
      /\\frac\{(\d+)\s+([a-zA-Z])\}\{([^{}]+)\}\s*\2\b/g,
      "\\frac{$1}{$3}$2"
    );
    result = result.replace(
      /\\frac\{([^{}]*?)\s*([a-zA-Z])\}\{([^{}]+)\}\s*\2\b/g,
      "\\frac{$1}{$3}$2"
    );
  }

  return result;
}

/** \frac{3} {5} or \frac{3}\n{5} → \frac{3}{5} */
function fixSplitFractionBraces(latex: string): string {
  let result = latex;
  let previous = "";

  while (previous !== result) {
    previous = result;
    result = result.replace(
      /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      "\\frac{$1}{$2}"
    );
  }

  return result;
}

/** Polish decimal comma → LaTeX-safe `{,}`. Skip interval commas. */
function fixDecimalComma(latex: string): string {
  // Avoid turning interval (-2,+\infty) or (-2,3) into decimals.
  return latex.replace(/(\d),(\d)/g, (full, a, b, offset, src) => {
    const before = src.slice(Math.max(0, offset - 12), offset);
    const after = src.slice(offset, offset + 16);
    if (/[(\[][^)\]]*$/.test(before) && /[,;+\-\\infty]/.test(after)) {
      return full;
    }
    return `${a}{,}${b}`;
  });
}

/** High-school relation / operator shortcuts CoMER often emits as ASCII. */
function fixRelationsAndOperators(latex: string): string {
  let result = latex;

  result = result.replace(/<=/g, "\\le ");
  result = result.replace(/>=/g, "\\ge ");
  result = result.replace(/!=/g, "\\neq ");
  result = result.replace(/\\neq\s*/g, "\\neq ");
  result = result.replace(/(?<![\\a-zA-Z])pm(?![a-zA-Z])/g, "\\pm ");
  result = result.replace(/\+-/g, "\\pm ");
  result = result.replace(/-\+/g, "\\mp ");
  result = result.replace(/=>/g, "\\Rightarrow ");
  result = result.replace(/<=>/g, "\\Leftrightarrow ");
  result = result.replace(/<->/g, "\\leftrightarrow ");
  result = result.replace(/(?<!-)->/g, "\\to ");
  result = result.replace(/\\times\b/g, "\\times ");
  result = result.replace(/\\div\b/g, "\\div ");
  result = result.replace(/\\infty\b/g, "\\infty ");
  result = result.replace(/\boo\b/gi, "\\infty ");
  result = result.replace(/\binf\b/gi, "\\infty ");

  return result;
}

/**
 * ∈ / ∉ / ℝ ℕ ℤ ℚ ℂ — CoMER frequently misreads these.
 * Screenshot: x_{t}-2,+\\infty) → x \\in (-2,+\\infty)
 */
function fixSetMembership(latex: string): string {
  let result = latex;

  // ∈ misread as subscript t / e / c / epsilon before an interval or number
  result = result.replace(
    /([a-zA-Z])(?:_\{(?:t|e|c|epsilon|varepsilon|in)\}|_[tec])(?=\s*(?:[-+(]|\d))/gi,
    "$1 \\in "
  );
  result = result.replace(
    /([a-zA-Z])\s*\\varepsilon(?=\s*(?:[-+(]|\d))/gi,
    "$1 \\in "
  );
  result = result.replace(
    /([a-zA-Z])\s+e(?=\s*(?:[-+(]|\d))/g,
    "$1 \\in "
  );

  // ∉ misread as !∈ / notin / nein
  result = result.replace(/\\notin\b/g, "\\notin ");
  result = result.replace(
    /([a-zA-Z])\s*(?:!\\in|\\neq\\in|notin)\b/gi,
    "$1 \\notin "
  );

  // Number sets after ∈ / ∉
  const setMap: Record<string, string> = {
    R: "\\mathbb{R}",
    N: "\\mathbb{N}",
    Z: "\\mathbb{Z}",
    Q: "\\mathbb{Q}",
    C: "\\mathbb{C}",
  };
  for (const [letter, cmd] of Object.entries(setMap)) {
    result = result.replace(
      new RegExp(`\\\\in\\s*${letter}\\b`, "g"),
      `\\in ${cmd}`
    );
    result = result.replace(
      new RegExp(`\\\\notin\\s*${letter}\\b`, "g"),
      `\\notin ${cmd}`
    );
    result = result.replace(
      new RegExp(`\\\\mathrm\\{${letter}\\}`, "g"),
      cmd
    );
    result = result.replace(
      new RegExp(`\\\\mathbf\\{${letter}\\}`, "g"),
      cmd
    );
  }

  result = result.replace(
    /\\Pi\s*i\s*\\Pi/gi,
    "\\in \\mathbb{R}"
  );
  result = result.replace(
    /([a-zA-Z])\s*\\Pi\s*i\s*R\b/gi,
    "$1 \\in \\mathbb{R}"
  );
  result = result.replace(
    /([a-zA-Z])\s+i\s*R\b/g,
    "$1 \\in \\mathbb{R}"
  );
  result = result.replace(
    /([a-zA-Z)\]])\s*\\times\s*\d*\s*R\b/gi,
    "$1 \\in \\mathbb{R}"
  );
  result = result.replace(
    /\\times\s*\d+\s*R\b/gi,
    "\\in \\mathbb{R}"
  );
  result = result.replace(
    /([a-zA-Z])\s*\\times\s*R\b/gi,
    "$1 \\in \\mathbb{R}"
  );
  result = result.replace(
    /\)\s*\\times\s*[a-zA-Z]?\s*[kx]\b/gi,
    ") \\in \\mathbb{R}"
  );
  result = result.replace(
    /\\times\s*x\s*k\b/gi,
    "\\in \\mathbb{R}"
  );
  result = result.replace(
    /(\))\s*x\s*k\b/gi,
    "$1 x \\in \\mathbb{R}"
  );

  // Trailing garbage after number sets: \mathbb{R} j → \mathbb{R}
  result = result.replace(
    /(\\mathbb\{[RNZQC]\})\s*[a-zA-Z]\b/g,
    "$1"
  );

  // Ensure space: x\in → x \in
  result = result.replace(/([a-zA-Z0-9)])\\in/g, "$1 \\in ");
  result = result.replace(/([a-zA-Z0-9)])\\notin/g, "$1 \\notin ");

  return result;
}

/** `3 x` → `3x`, `\frac{3}{5} x` → `\frac{3}{5}x`. */
function fixImplicitMultiplication(latex: string): string {
  let result = latex;

  result = result.replace(/(\d)\s+([a-zA-Z])/g, "$1$2");
  result = result.replace(
    /\\frac\{([^{}]*)\}\{([^{}]*)\}\s+([a-zA-Z])/g,
    "\\frac{$1}{$2}$3"
  );
  // Don't glue ) to letters when it's likely ")\in" / "), x"
  result = result.replace(/([})])\s+(?=[a-zA-Z(])/g, "$1 ");

  return result;
}

const INTERVAL_ENDPOINT =
  String.raw`(?:\+?-?(?:\\infty|\d+(?:\{,\}\d+)?))`;

/**
 * Polish school notation: `<a,b>` / `<a,b)` means closed with `[` / half-open.
 * Also normalize \langle \rangle.
 */
function normalizePolishAngleIntervalBrackets(latex: string): string {
  let result = latex;

  result = result.replace(/\\langle\b/g, "<");
  result = result.replace(/\\rangle\b/g, ">");

  // <a, b>  <a; b>  <a, b)  (a, b>  etc.
  result = result.replace(
    new RegExp(
      String.raw`<(\s*${INTERVAL_ENDPOINT}\s*[,;]\s*${INTERVAL_ENDPOINT}\s*)>`,
      "g"
    ),
    "[$1]"
  );
  result = result.replace(
    new RegExp(
      String.raw`<(\s*${INTERVAL_ENDPOINT}\s*[,;]\s*${INTERVAL_ENDPOINT}\s*)\)`,
      "g"
    ),
    "[$1)"
  );
  result = result.replace(
    new RegExp(
      String.raw`\((\s*${INTERVAL_ENDPOINT}\s*[,;]\s*${INTERVAL_ENDPOINT}\s*)>`,
      "g"
    ),
    "($1]"
  );
  result = result.replace(
    new RegExp(
      String.raw`\[(\s*${INTERVAL_ENDPOINT}\s*[,;]\s*${INTERVAL_ENDPOINT}\s*)>`,
      "g"
    ),
    "[$1]"
  );

  return result;
}

/**
 * CoMER often drops `[` (and Polish `<`) but keeps `)`.
 * Orphan `a, b)` → `[a, b)` (finite interval). Orphan `a; b)` → `(a; b)` (coords).
 * Infinity endpoints stay open: `a,+\\infty)` → `(a,+\\infty)`.
 * Negative lookbehind avoids matching inside already-open intervals (e.g. `-4` → `4`).
 */
function repairMissingClosedIntervalOpeners(latex: string): string {
  let result = latex;

  // Finite comma interval missing opener → closed-left [
  result = result.replace(
    /(?<![(\[\-0-9])(-?\d+(?:\{,\}\d+)?)\s*,\s*(-?\d+(?:\{,\}\d+)?)\s*\)/g,
    "[$1, $2)"
  );

  // Infinity missing opener → open (
  result = result.replace(
    /(?<![(\[\-0-9])(-?\d+(?:\{,\}\d+)?)\s*,\s*(\+?\\infty|\+?oo|\+?inf)\s*\)/gi,
    "($1,$2)"
  );

  // Semicolon pair missing opener → coordinate (
  result = result.replace(
    new RegExp(
      String.raw`(?<![(\[\-0-9])(-?\d+(?:\{,\}\d+)?)\s*;\s*(${INTERVAL_ENDPOINT})\s*\)`,
      "g"
    ),
    "($1; $2)"
  );

  // Orphan …] with missing open → prefer (
  result = result.replace(
    new RegExp(
      String.raw`(?<![(\[\-0-9])(-?\d+(?:\{,\}\d+)?)\s*([,;])\s*(${INTERVAL_ENDPOINT})\s*\]`,
      "g"
    ),
    "($1$2$3]"
  );

  return result;
}

/**
 * Apply stroke-inferred openers (`[` for `[`/`<`, `(` for paren) to interval chunks.
 */
export function applyStrokeInferredIntervalBrackets(
  latex: string,
  openers: Array<"[" | "(" | null>
): string {
  if (openers.length === 0) {
    return latex;
  }

  let index = 0;
  const intervalChunk = new RegExp(
    String.raw`([(\[]|<)?(\s*${INTERVAL_ENDPOINT}\s*[,;]\s*${INTERVAL_ENDPOINT}\s*)([)\]]|>)`,
    "g"
  );

  return latex.replace(intervalChunk, (_full, open, body, close) => {
    const hint = openers[index++] ?? null;
    let left = open ?? "";
    let right = close;

    if (left === "<") {
      left = "[";
    }
    if (right === ">") {
      right = "]";
    }

    if (!left) {
      left = hint ?? (right === ")" ? "[" : "(");
    } else if (hint === "[" && left === "(") {
      // Stroke looks like [ or Polish < — CoMER often emits (
      left = "[";
    }

    // Half-open / bracket intervals keep comma (not coordinate semicolon)
    let inner = body;
    if (left === "[" || right === "]") {
      inner = inner.replace(";", ",");
    }

    return `${left}${inner}${right}`;
  });
}

/**
 * Repair intervals / parentheses / infinity.
 */
function fixIntervalsAndParentheses(latex: string): string {
  let result = latex;

  result = result.replace(
    /^(?:(?:\\cdots|\\dots|\\ldots|\.\.\.|\\cdot)\s*)+/g,
    ""
  );
  // Lone leading \infty before a signed number (not an interval endpoint)
  result = result.replace(/^\\infty\s*(?=-?\d)/g, "");

  result = result.replace(/(\d)\s+(?=\d)/g, "$1");

  result = normalizePolishAngleIntervalBrackets(result);

  // (-5{,}200) as coordinate/pair with misread semicolon — only both finite integers
  result = result.replace(
    /([(\[])(-?\d+)\{,\}(\d{2,})([)\]])/g,
    "$1$2;$3$4"
  );

  result = result.replace(
    /(-?\d+)(?:i|I|\||l)\s*(-?\d+)(\))/g,
    "$1;$2$3"
  );

  // x \in -2,+∞)  →  x \in (-2,+∞)   (missing opening; ∞ ⇒ open)
  result = result.replace(
    /(\\in\s*)(-?\d+)\s*([,;])\s*(\+?\\infty|\+?oo|\+?inf)(\))/gi,
    "$1($2$3$4$5"
  );

  result = repairMissingClosedIntervalOpeners(result);

  // Still missing `(` but has `)` after a signed start (∞ / membership)
  {
    const opens =
      (result.match(/\(/g) ?? []).length + (result.match(/\[/g) ?? []).length;
    const closes =
      (result.match(/\)/g) ?? []).length + (result.match(/\]/g) ?? []).length;
    if (closes > opens) {
      result = result.replace(/(\\in\s*)(-?\d+)/g, "$1($2");
      result = repairMissingClosedIntervalOpeners(result);
    }
  }

  // Finite coordinate pairs (a,b) → Polish semicolon. Keep commas for [ / ] intervals.
  result = result.replace(
    /\(\s*(-?\d+(?:\{,\}\d+)?)\s*,\s*(-?\d+(?:\{,\}\d+)?)\s*\)/g,
    "($1;$2)"
  );

  // Infinity open intervals keep comma
  result = result.replace(
    /([(\[])(-?\d+)\s*[,;]\s*\+?\s*(?:oo|inf)\\?\s*([)\]])/gi,
    "$1$2,+\\infty$3"
  );
  result = result.replace(
    /([(\[])(-?\d+)\s*[,;]\s*\+?\s*\\infty\s*([)\]])/g,
    "$1$2,+\\infty$3"
  );
  result = result.replace(
    /([(\[])\s*\+?\s*\\infty\s*[,;]\s*(-?\d+)\s*([)\]])/g,
    "$1-\\infty,$2$3"
  );

  // Bracket intervals: normalize spaces, keep comma
  result = result.replace(
    /\[\s*(-?\d+(?:\{,\}\d+)?)\s*[,;]\s*(-?\d+(?:\{,\}\d+)?)\s*\)/g,
    "[$1, $2)"
  );
  result = result.replace(
    /\[\s*(-?\d+(?:\{,\}\d+)?)\s*[,;]\s*(-?\d+(?:\{,\}\d+)?)\s*\]/g,
    "[$1, $2]"
  );
  result = result.replace(
    /\(\s*(-?\d+(?:\{,\}\d+)?)\s*[,;]\s*(-?\d+(?:\{,\}\d+)?)\s*\]/g,
    "($1, $2]"
  );

  result = result.replace(/\(\s*/g, "(");
  result = result.replace(/\s*\)/g, ")");
  result = result.replace(/\[\s*/g, "[");
  result = result.replace(/\s*\]/g, "]");
  result = result.replace(/;\s*/g, "; ");
  result = result.replace(/\(\s*(-?\d+)\s*;\s*(-?\d+)\s*\)/g, "($1; $2)");
  result = result.replace(
    /\((-?\d+),\+\\infty\)/g,
    "($1,+\\infty)"
  );

  // Separate compound statements: ),x ∈ → ),\; x ∈
  result = result.replace(
    /(\))\s*,\s*(x\s*\\in)/gi,
    "$1,\\; $2"
  );
  result = result.replace(
    /(\))\s+(x\s*\\in)/gi,
    "$1,\\; $2"
  );
  // Interval then bare ∈ ℝ (lost second "x"): )\\in \\mathbb{R} → ),\\; x \\in \\mathbb{R}
  result = result.replace(
    /(\))\s*\\in\s*(\\mathbb\{[RNZQC]\})/g,
    "$1,\\; x \\in $2"
  );

  return result;
}

/** Detect LaTeX that likely mangled ∈ / intervals and needs stroke re-split. */
export function looksLikeBrokenMembershipOrInterval(latex: string): boolean {
  const opens =
    (latex.match(/\(/g) ?? []).length + (latex.match(/\[/g) ?? []).length;
  const closes =
    (latex.match(/\)/g) ?? []).length + (latex.match(/\]/g) ?? []).length;
  if (closes > opens) {
    return true;
  }
  // Orphan half-open interval missing opener: -5, 3)
  if (/(?:^|[^(\[])-?\d+(?:\{,\}\d+)?\s*[,;]\s*(?:\+?-?(?:\\infty|\d+))\s*\)/.test(latex)) {
    return true;
  }
  if (/_\{?(?:t|e|c)\}?/.test(latex) && /\\infty|,|\d/.test(latex)) {
    return true;
  }
  if (/\\mathbb\{[RNZQC]\}\s*[a-zA-Z]\b/.test(latex)) {
    return true;
  }
  // x_t-2 or xt-2 style before infinity
  if (/[a-zA-Z]_\{?t\}?-?\d/.test(latex) && /\\infty|\)/.test(latex)) {
    return true;
  }
  return false;
}

/** Drop spurious `cases` when no row looks like an equation. */
function unwrapFalseCases(latex: string): string {
  const match = latex.match(
    /^\\begin\{cases\}\s*([\s\S]+?)\s*\\end\{cases\}$/
  );
  if (!match) {
    return latex;
  }

  const rows = match[1]
    .split(/\s*\\\\\s*/)
    .map((row) => row.trim())
    .filter(Boolean);

  const equationRows = rows.filter((row) => /=/.test(row));
  if (equationRows.length >= 2) {
    return latex;
  }

  const garbage = new Set(["\\cdots", "\\dots", "\\ldots", "..."]);
  const merged = rows
    .filter((row) => !garbage.has(row))
    .join(" ")
    .trim();

  return merged || latex;
}

function compactSpacing(latex: string): string {
  return latex
    .replace(/\s+/g, " ")
    .replace(/\s*([{}(),.=+\-*/^_])\s*/g, "$1")
    .replace(/\\([a-zA-Z]+)\s+/g, "\\$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function enhanceRecognizedLatex(latex: string): string {
  if (!latex.trim()) {
    return "";
  }

  let result = latex.trim();
  result = compactSpacing(result);
  result = unwrapFalseCases(result);
  result = fixSplitFractionBraces(result);
  result = fixTrigAndGreek(result);
  result = fixLimitsAndOperators(result);
  result = fixNestedFractions(result);
  result = fixDuplicateVariableAfterFraction(result);
  result = fixRoots(result);
  result = stripInvalidLimits(result);
  result = fixRelationsAndOperators(result);
  result = fixSetMembership(result);
  result = fixIntervalsAndParentheses(result);
  result = fixSetMembership(result); // second pass after paren repair
  result = fixImplicitMultiplication(result);
  result = fixDecimalComma(result);
  result = compactSpacing(result);
  // Keep a thin space after membership before brackets: \in( → \in (
  result = result.replace(/\\in\(/g, "\\in (");
  result = result.replace(/\\notin\(/g, "\\notin (");
  result = result.replace(/\\in\[/g, "\\in [");
  result = result.replace(/\\notin\[/g, "\\notin [");

  return result;
}

export type MultiLineLayout = "single" | "cases" | "aligned" | "piecewise";

/**
 * Choose LaTeX environment for multiple recognized lines based on content.
 */
export function chooseMultiLineLayout(
  lines: string[],
  hasLeftBrace: boolean
): MultiLineLayout {
  if (lines.length <= 1) {
    return "single";
  }

  if (hasLeftBrace) {
    const hasConditions = lines.some(
      (line) =>
        /[,;]\s*(?:x|y|t|n|k|m|z|a|b|c)\s*[<>≤≥=]|(?:if|gdy|dla)\b/i.test(
          line
        ) || /,\s*[-\d]/.test(line)
    );
    return hasConditions ? "piecewise" : "cases";
  }

  const equationLines = lines.filter((line) => /=/.test(line));
  if (equationLines.length >= 2) {
    return "aligned";
  }

  return "cases";
}

export function assembleEnhancedLineLatex(
  lineLatex: string[],
  layout: MultiLineLayout
): string {
  const lines = lineLatex.map((line) => enhanceRecognizedLatex(line)).filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    return lines[0];
  }

  switch (layout) {
    case "aligned": {
      const alignedBody = lines
        .map((line) => {
          const eqIndex = line.indexOf("=");
          if (eqIndex === -1) {
            return line;
          }
          const lhs = line.slice(0, eqIndex).trim();
          const rhs = line.slice(eqIndex + 1).trim();
          return `${lhs} &= ${rhs}`;
        })
        .join(" \\\\ ");
      return `\\begin{aligned} ${alignedBody} \\end{aligned}`;
    }
    case "piecewise":
    case "cases":
      return `\\begin{cases} ${lines.join(" \\\\ ")} \\end{cases}`;
    default:
      return lines.join(" \\\\ ");
  }
}
