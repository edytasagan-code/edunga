export const MATH_TEMPLATE_LATEX = {
  sqrt: "\\sqrt{#0}",
  frac: "\\frac{#0}{#?}",
  superscript: "^{2}",
  superscript3: "^{3}",
  exponent: "^{#0}",
  pi: "\\pi",
  le: "\\le",
  ge: "\\ge",
  log: "\\log_{#0}#?",
  ln: "\\ln\\left(#0\\right)",
  paren: "\\left(#0\\right)",
  bracket: "\\left[#0\\right]",
  brace: "\\left\\{#0\\right\\}",
} as const;

export const MATH_SYMBOL_LATEX = {
  in: "\\in",
  notin: "\\notin",
  subset: "\\subset",
  cup: "\\cup",
  cap: "\\cap",
  pm: "\\pm",
  infty: "\\infty",
} as const;

export type MathTemplateKey = keyof typeof MATH_TEMPLATE_LATEX;
export type MathSymbolKey = keyof typeof MATH_SYMBOL_LATEX;
