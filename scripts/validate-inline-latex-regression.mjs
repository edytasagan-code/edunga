/**
 * Quick regression check: LaTeX fragments must become MathNodes in Vision/CKE import.
 */
import {
  splitInlineMathContent,
  mathFragmentToLatex,
  inlineContentToInlineNodes,
} from "../app/lib/import/visionInlineMath.ts";
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

const latexExamples = [
  "\\frac{25}{8}",
  "\\sqrt{2}",
  "2^{-1}",
  "4^{12}",
  "5^{24}",
];

for (const ex of latexExamples) {
  check(
    `mathFragmentToLatex: ${ex}`,
    mathFragmentToLatex(ex) === ex,
    String(mathFragmentToLatex(ex))
  );
  const segments = splitInlineMathContent(ex);
  check(
    `splitInlineMathContent single math: ${ex}`,
    segments.length === 1 &&
      segments[0]?.kind === "math" &&
      segments[0]?.value === ex,
    JSON.stringify(segments)
  );
}

const wrapped = "Wartość \\(\\frac{25}{8}\\) jest większa od \\(\\sqrt{2}\\).";
const wrappedSegments = splitInlineMathContent(wrapped);
check(
  "wrapped LaTeX produces two math segments",
  wrappedSegments.filter((s) => s.kind === "math").length === 2,
  JSON.stringify(wrappedSegments)
);
check(
  "wrapped LaTeX fraction preserved",
  wrappedSegments.some(
    (s) => s.kind === "math" && s.value === "\\frac{25}{8}"
  )
);
check(
  "wrapped LaTeX sqrt preserved",
  wrappedSegments.some((s) => s.kind === "math" && s.value === "\\sqrt{2}")
);

const nodes = inlineContentToInlineNodes(
  wrapped,
  [],
  (text) => ({ type: "text", text }),
  (latex) => ({ type: "math", latex })
);
check(
  "inlineContentToInlineNodes creates correct MathNodes",
  nodes.some((n) => n.type === "math" && n.latex === "\\frac{25}{8}") &&
    nodes.some((n) => n.type === "math" && n.latex === "\\sqrt{2}"),
  JSON.stringify(nodes)
);

// Vision-style still works
for (const ex of ["25/8", "√2"]) {
  check(
    `vision notation still math: ${ex}`,
    splitInlineMathContent(ex).some((s) => s.kind === "math"),
    JSON.stringify(splitInlineMathContent(ex))
  );
}

const exercise = {
  identifier: "18",
  exerciseKind: "multiple_choice",
  instruction: "Dokończ zdanie.",
  question:
    "Liczba \\(\\frac{25}{8}\\) jest równa \\(\\sqrt{2}\\) podniesionemu do potęgi",
  choices: [
    { label: "A", text: "2^{-1}" },
    { label: "B", text: "4^{12}" },
    { label: "C", text: "5^{24}" },
    { label: "D", text: "1" },
  ],
  subtasks: [],
  answers: [{ label: "", value: "A" }],
};

const docs = visionExerciseToEditorDocuments(exercise, "latex-regression");
const allNodes = docs.tresc.paragraphs.flatMap((paragraph) => paragraph.children);
check(
  "EditorDocument fraction MathNode",
  allNodes.some((node) => node.type === "math" && node.latex === "\\frac{25}{8}")
);
check(
  "EditorDocument sqrt MathNode",
  allNodes.some((node) => node.type === "math" && node.latex === "\\sqrt{2}")
);
check(
  "EditorDocument choice superscript MathNode",
  allNodes.some((node) => node.type === "math" && node.latex === "2^{-1}")
);
check(
  "EditorDocument no false set-literal braces",
  !allNodes.some(
    (node) => node.type === "math" && node.latex.includes("\\left\\{25\\right\\}")
  )
);

console.log("\nSample nodes:", JSON.stringify(docs.tresc.paragraphs, null, 2));
