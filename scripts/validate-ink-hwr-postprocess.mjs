/**
 * Offline checks for ink-hwr stroke clustering (no CoMER / browser).
 * Run: node scripts/validate-ink-hwr-postprocess.mjs
 */
import assert from "node:assert/strict";

const { register } = await import("tsx/esm/api");
register();

const { enhanceRecognizedLatex } = await import(
  "../app/lib/ink-hwr/latexEnhance.ts"
);

const {
  repairMisreadIntegralAsEquations,
  findLeftBraceStrokeIndex,
  clusterStrokesIntoLines,
  assembleLineLatex,
  splitStrokesByLargestYGap,
  isLikelySingleLineExpression,
  countEqualsSignStrokes,
  isImplausibleRecognition,
} = await import("../app/lib/ink-hwr/strokes.ts");

function stroke(points) {
  return { points, color: "#000", width: 2 };
}

function hline(y, x1, x2) {
  return stroke([
    { x: x1, y },
    { x: x2, y },
  ]);
}

assert.equal(
  enhanceRecognizedLatex("\\frac{2 y}{5}y=0,8"),
  "\\frac{2}{5}y=0{,}8"
);
assert.equal(
  enhanceRecognizedLatex("\\frac{3} {5}x+\\frac{2 y}{5}y=0,8"),
  "\\frac{3}{5}x+\\frac{2}{5}y=0{,}8"
);
assert.equal(enhanceRecognizedLatex("3 x+4=4"), "3x+4=4");
assert.equal(
  enhanceRecognizedLatex("x \\Pi i \\Pi"),
  "x \\in \\mathbb{R}"
);
assert.ok(
  enhanceRecognizedLatex("(-5{,}200)\\times 8R").includes("\\in \\mathbb{R}")
);
assert.ok(
  enhanceRecognizedLatex("(-5{,}200)\\times 8R").includes("(-5; 200)")
);
assert.ok(
  enhanceRecognizedLatex(
    "\\begin{cases} \\cdots \\\\ -5{,}200)\\times 8R \\end{cases}"
  ).includes("\\in \\mathbb{R}")
);
assert.ok(
  !enhanceRecognizedLatex(
    "\\begin{cases} \\cdots \\\\ -5{,}200)\\times 8R \\end{cases}"
  ).includes("\\begin{cases}")
);

// Leading garbage before a finite interval/coord
{
  const fixed = enhanceRecognizedLatex(
    "\\cdots \\infty -5i 2 0 0)\\times x k"
  );
  assert.ok(fixed.includes("(-5; 200)") || fixed.includes("(-5;200)"), `got: ${fixed}`);
  assert.ok(fixed.includes("\\in \\mathbb{R}"), `got: ${fixed}`);
  assert.ok(!fixed.includes("\\cdots"), `got: ${fixed}`);
}

// Screenshot: x_{t}-2,+\\infty)\\in \\mathbb{R} j
{
  const fixed = enhanceRecognizedLatex(
    "x_{t}-2,+\\infty)\\in \\mathbb{R} j"
  );
  assert.ok(fixed.includes("\\in"), `got: ${fixed}`);
  assert.ok(fixed.includes("(-2,+\\infty)"), `got: ${fixed}`);
  assert.ok(fixed.includes("\\mathbb{R}"), `got: ${fixed}`);
  assert.ok(!/\\mathbb\{R\}\s*j/.test(fixed), `got: ${fixed}`);
  assert.ok(!fixed.includes("_{t}"), `got: ${fixed}`);
}

assert.ok(
  enhanceRecognizedLatex("x \\in R").includes("\\mathbb{R}")
);
assert.ok(enhanceRecognizedLatex("a <= b").includes("\\le"));
assert.ok(enhanceRecognizedLatex("a -> b").includes("\\to"));

// Closed interval openers: [ and Polish < (both → [)
assert.equal(enhanceRecognizedLatex("-5, 3)"), "[-5,3)");
assert.equal(enhanceRecognizedLatex("<-4, 2)"), "[-4,2)");
assert.equal(enhanceRecognizedLatex("< -4; 2 >"), "[-4,2]");
assert.equal(enhanceRecognizedLatex("(-4, 2>"), "(-4,2]");
assert.ok(
  enhanceRecognizedLatex("-5, 3)(-4; 2)").includes("[-5,3)"),
  enhanceRecognizedLatex("-5, 3)(-4; 2)")
);
assert.ok(
  enhanceRecognizedLatex("x \\in -5, 3)").includes("[-5,3)"),
  enhanceRecognizedLatex("x \\in -5, 3)")
);
{
  const {
    applyStrokeInferredIntervalBrackets,
  } = await import("../app/lib/ink-hwr/latexEnhance.ts");
  const {
    classifyLeftIntervalOpener,
  } = await import("../app/lib/ink-hwr/strokes.ts");

  // Stroke `[`: vertical + top/bottom caps
  const bracketStrokes = [
    stroke([
      { x: 10, y: 10 },
      { x: 10, y: 50 },
    ]),
    stroke([
      { x: 10, y: 10 },
      { x: 22, y: 10 },
    ]),
    stroke([
      { x: 10, y: 50 },
      { x: 22, y: 50 },
    ]),
  ];
  assert.equal(classifyLeftIntervalOpener(bracketStrokes), "[");

  // Stroke Polish `<` (chevron)
  const angleStrokes = [
    stroke([
      { x: 30, y: 10 },
      { x: 10, y: 30 },
      { x: 30, y: 50 },
    ]),
  ];
  assert.equal(classifyLeftIntervalOpener(angleStrokes), "[");

  assert.equal(
    applyStrokeInferredIntervalBrackets("(-4; 2)", ["["]),
    "[-4, 2)"
  );
  assert.equal(
    applyStrokeInferredIntervalBrackets("(-4; 2)", ["("]),
    "(-4; 2)"
  );
}

// Interval/coords + ∈ R — single horizontal line, no brace.
const intervalStrokes = [
  stroke([
    { x: 8, y: 20 },
    { x: 8, y: 50 },
  ]), // `(` — must NOT be treated as system brace
  stroke([
    { x: 20, y: 45 },
    { x: 28, y: 45 },
  ]),
  stroke([
    { x: 35, y: 45 },
    { x: 42, y: 45 },
  ]),
  stroke([
    { x: 55, y: 45 },
    { x: 70, y: 45 },
  ]),
  stroke([
    { x: 75, y: 45 },
    { x: 82, y: 45 },
  ]),
  stroke([
    { x: 90, y: 20 },
    { x: 90, y: 50 },
  ]), // `)`
  stroke([
    { x: 100, y: 45 },
    { x: 108, y: 45 },
  ]),
  stroke([
    { x: 120, y: 45 },
    { x: 128, y: 45 },
  ]),
];
assert.ok(isLikelySingleLineExpression(intervalStrokes));
assert.equal(findLeftBraceStrokeIndex(intervalStrokes), -1);
assert.equal(clusterStrokesIntoLines(intervalStrokes).length, 1);

// Coordinate / ∈ ℝ — must stay one line (not cases).
const coordStrokes = [
  stroke([
    { x: 10, y: 40 },
    { x: 15, y: 35 },
  ]),
  stroke([
    { x: 25, y: 40 },
    { x: 30, y: 40 },
  ]),
  hline(42, 50, 100), // fraction bar (wide — not `=`)
  stroke([
    { x: 55, y: 52 },
    { x: 60, y: 52 },
  ]),
  stroke([
    { x: 100, y: 40 },
    { x: 110, y: 40 },
  ]),
  stroke([
    { x: 130, y: 40 },
    { x: 140, y: 40 },
  ]),
];
assert.ok(isLikelySingleLineExpression(coordStrokes));
assert.equal(countEqualsSignStrokes(coordStrokes), 0);
const coordLines = clusterStrokesIntoLines(coordStrokes);
assert.equal(coordLines.length, 1);

assert.equal(
  enhanceRecognizedLatex("\\frac{2 y}{5}y"),
  "\\frac{2}{5}y"
);
assert.equal(
  enhanceRecognizedLatex("3 x+2 y=4"),
  "3x+2y=4"
);
assert.equal(enhanceRecognizedLatex("0,8"), "0{,}8");

const integralFix = repairMisreadIntegralAsEquations(
  "\\int\\limits_{4}^{2x+3=5}{y+7}"
);
assert.ok(integralFix?.includes("\\begin{cases}"));

const cases = assembleLineLatex(["2x+3=5", "4x+y=7"], true);
assert.ok(cases.includes("\\begin{cases}"));

// System with brace + two equation rows (like user screenshot).
const braceStrokes = [
  stroke([
    { x: 10, y: 10 },
    { x: 12, y: 100 },
  ]),
  // row 1: 3x+2y=4
  stroke([
    { x: 40, y: 28 },
    { x: 55, y: 28 },
  ]),
  stroke([
    { x: 60, y: 28 },
    { x: 75, y: 28 },
  ]),
  hline(30, 120, 140), // =
  stroke([
    { x: 150, y: 28 },
    { x: 160, y: 28 },
  ]),
  // row 2: 3/5 x + 2/5 y = 0.8
  stroke([
    { x: 40, y: 58 },
    { x: 50, y: 58 },
  ]),
  hline(65, 38, 58), // frac bar
  stroke([
    { x: 42, y: 72 },
    { x: 50, y: 72 },
  ]),
  stroke([
    { x: 62, y: 72 },
    { x: 72, y: 72 },
  ]),
  hline(65, 58, 78), // frac bar
  stroke([
    { x: 64, y: 72 },
    { x: 72, y: 72 },
  ]),
  hline(70, 120, 140), // =
  stroke([
    { x: 150, y: 72 },
    { x: 170, y: 72 },
  ]),
];

assert.equal(findLeftBraceStrokeIndex(braceStrokes), 0);

const lines = clusterStrokesIntoLines(braceStrokes, [0], {
  expectMultipleRows: true,
});
assert.ok(
  lines.length >= 2,
  `expected >=2 lines for system, got ${lines.length}`
);

const split = splitStrokesByLargestYGap(braceStrokes.slice(1));
assert.ok(split.length >= 2);

assert.ok(isImplausibleRecognition("1", 12));
assert.ok(!isImplausibleRecognition("(-2,+\\infty)", 12));

{
  const wide = [];
  for (let i = 0; i < 5; i++) {
    wide.push(
      stroke([
        { x: 10 + i * 12, y: 40 },
        { x: 18 + i * 12, y: 40 },
      ])
    );
  }
  for (let i = 0; i < 4; i++) {
    wide.push(
      stroke([
        { x: 200 + i * 12, y: 40 },
        { x: 208 + i * 12, y: 40 },
      ])
    );
  }
  const { splitStrokesByLargestXGap: splitX } = await import(
    "../app/lib/ink-hwr/strokes.ts"
  );
  const parts = splitX(wide, 20);
  assert.equal(parts.length, 2);
}
