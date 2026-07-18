/**
 * AST-based math notation parser + LaTeX renderer tests.
 */
import { visionExpressionToLatex } from "../app/lib/import/visionNotationToLatex.ts";
import { labeledAssignmentToLatex } from "../app/lib/import/visionInlineMath.ts";
import { parseMathNotation } from "../app/lib/import/mathNotation/parse.ts";
import { mathAstToLatex } from "../app/lib/import/mathNotation/latex.ts";

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

const exercise141a = "(-1 3/4) · (-2,5) · 3 5/6 · (-6) · 4/7 · 2";
const latex141a = visionExpressionToLatex(exercise141a);
check("1.41a mixed numbers", latex141a.includes("-1\\,\\frac{3}{4}"), latex141a);
check("1.41a multiplication", latex141a.includes("\\cdot"), latex141a);
check("1.41a no false left/right wrap", !latex141a.includes("\\left"), latex141a);

const exercise141b = "0,375 · 4 · √6 · (-1/√6) · (-0,25) · (-8)";
const latex141b = visionExpressionToLatex(exercise141b);
check("1.41b sqrt fraction", latex141b.includes("\\frac{-1}{\\sqrt{6}}"), latex141b);

const exercise140a = "(-3,4) + 6 3/4 + 1 1/3 + (-0,6) + (1/3) + (-0,75)";
const latex140a = visionExpressionToLatex(exercise140a);
check("1.40a addition preserved", latex140a.includes("+"), latex140a);
check("1.40a mixed 6 3/4", latex140a.includes("6\\,\\frac{3}{4}"), latex140a);
check("1.40a mixed 1 1/3", latex140a.includes("1\\,\\frac{1}{3}"), latex140a);
check("1.40a fraction 1/3", latex140a.includes("\\frac{1}{3}"), latex140a);
check("1.40a no parens around 1/3", !latex140a.includes("(\\frac{1}{3})"), latex140a);
check("1.40a no parens around -4/7", !latex140a.includes("(\\frac{-4}{7})"), latex140a);
check("1.40a no false left/right wrap", !latex140a.includes("\\left"), latex140a);

const exercise140b = "2,75 + (-1 3/7) + 4,2 + (-4/7) + 1/4 + (-1,2)";
const latex140b = visionExpressionToLatex(exercise140b);
check("1.40b mixed -1 3/7", latex140b.includes("-1\\,\\frac{3}{7}"), latex140b);
check("1.40b fraction -4/7", latex140b.includes("\\frac{-4}{7}"), latex140b);

const exercise140c = "(-√2) + 6,021 + 4 4/6 + 0,979 + (1/6) + √2";
const latex140c = visionExpressionToLatex(exercise140c);
check("1.40c sqrt2", latex140c.includes("\\sqrt{2}"), latex140c);
check("1.40c grouped negative sqrt", latex140c.includes("(-\\sqrt{2})"), latex140c);
check("1.40c no extra sqrt parens", !latex140c.includes("(-(\\sqrt{2}))"), latex140c);
check("1.40c mixed 4 4/6", latex140c.includes("4\\,\\frac{4}{6}"), latex140c);
check("1.40c fraction 1/6", latex140c.includes("\\frac{1}{6}"), latex140c);

const exercise140d = "-3 1/3 + 5,27 + 1 1/3 + 1,24 - 0,04 + 2,73";
const latex140d = visionExpressionToLatex(exercise140d);
check("1.40d mixed -3 1/3", latex140d.includes("-3\\,\\frac{1}{3}"), latex140d);
check("1.40d subtraction", latex140d.includes("- 0{,}04"), latex140d);

console.log("\n--- Sample outputs ---");
console.log("1.40a:", latex140a);
console.log("1.41a:", latex141a);

const ast = parseMathNotation("3 5/6");
check("AST mixed kind", ast.kind === "mixed");
check("AST to LaTeX mixed", mathAstToLatex(ast) === "3\\,\\frac{5}{6}");

const complexFractions = [
  ["(2√3-1)/6", "\\frac{2\\sqrt{3} - 1}{6}"],
  ["(4+3√3)/8", "\\frac{4 + 3\\sqrt{3}}{8}"],
  ["(4+3√5)/9", "\\frac{4 + 3\\sqrt{5}}{9}"],
  ["(3√5-4)/10", "\\frac{3\\sqrt{5} - 4}{10}"],
  ["(8√3-5)/6", "\\frac{8\\sqrt{3} - 5}{6}"],
  ["(2√3−1)/6", "\\frac{2\\sqrt{3} - 1}{6}"],
];

for (const [input, expected] of complexFractions) {
  const latex = visionExpressionToLatex(input);
  check(`complex fraction ${input}`, latex === expected, latex);
}

check(
  "unparenthesized sqrt numerator fraction",
  visionExpressionToLatex("2√3−1/6") === "\\frac{2\\sqrt{3} - 1}{6}"
);
check(
  "interval with fractions",
  visionExpressionToLatex("(1/2, 5/6)") ===
    "\\left(\\frac{1}{2},\\,\\frac{5}{6}\\right)"
);
check(
  "interval with negative fractions",
  visionExpressionToLatex("(-4/7, -1/2)") ===
    "\\left(\\frac{-4}{7},\\,\\frac{-1}{2}\\right)"
);
check(
  "tight interval with fraction endpoint",
  visionExpressionToLatex("(-4,3/2)") ===
    "\\left(-4,\\,\\frac{3}{2}\\right)"
);
check(
  "interval assignment A",
  visionExpressionToLatex("(-4, 3/2)") ===
    "\\left(-4,\\,\\frac{3}{2}\\right)"
);
check(
  "interval assignment B",
  visionExpressionToLatex("(1/3, 6)") ===
    "\\left(\\frac{1}{3},\\,6\\right)"
);
check(
  "negative sqrt",
  visionExpressionToLatex("-√2") === "-\\sqrt{2}"
);
check(
  "union with infinity",
  visionExpressionToLatex("(-∞, 1) ∪ (4, +∞)") ===
    "\\left(-\\infty,\\,1\\right) \\cup \\left(4,\\,+\\infty\\right)"
);
check(
  "labeled interval assignment",
  labeledAssignmentToLatex("A = (-4, 3 1/2)") ===
    "A = \\left(-4,\\,3\\,\\frac{1}{2}\\right)"
);
check(
  "general fraction pi over 2",
  visionExpressionToLatex("-π/2") === "\\frac{-\\pi}{2}"
);
check(
  "general fraction three eighths",
  visionExpressionToLatex("3/8") === "\\frac{3}{8}"
);
check(
  "set with fractions and pi",
  visionExpressionToLatex("{-√2, -π/2, 3/8}").includes("\\frac{-\\pi}{2}") &&
    visionExpressionToLatex("{-√2, -π/2, 3/8}").includes("\\frac{3}{8}")
);
check(
  "semicolon-separated set",
  visionExpressionToLatex("{−√2,25; -1 3/4; -π/2; 2,(37); √2}").includes(
    "2{,}\\overline{37}"
  )
);
check(
  "semicolon set preserves decimal in sqrt",
  visionExpressionToLatex("{−√2,25; -1 3/4; -π/2; 2,(37); √2}").includes("2{,}25")
);
check(
  "half-open interval",
  visionExpressionToLatex("(-4, 3 1/2]").includes("3\\,\\frac{1}{2}") &&
    visionExpressionToLatex("(-4, 3 1/2]").includes("\\right]")
);
