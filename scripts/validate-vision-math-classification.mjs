import {
  containsLatexEnvironment,
  hasMathSignals,
  looksLikeMeasurement,
  looksLikePlainTextFragment,
  shouldRenderAsMath,
} from "../app/lib/import/visionContentClassification.ts";
import {
  inlineContentToInlineNodes,
  mathFragmentToLatex,
} from "../app/lib/import/visionInlineMath.ts";
import { visionExpressionToLatex } from "../app/lib/import/visionNotationToLatex.ts";
import { answerValueToInlineNodes } from "../app/lib/import/visionToEditorDocument.ts";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

for (const word of ["cm", "tak", "nie", "lub", "oraz"]) {
  check(
    `plain text stays text: ${word}`,
    looksLikePlainTextFragment(word) && !shouldRenderAsMath(word)
  );
  check(`plain text has no latex: ${word}`, mathFragmentToLatex(word) === null);
}

for (const expr of ["1/3", "π/2", "√2"]) {
  check(
    `math fragment renders: ${expr}`,
    shouldRenderAsMath(expr) && mathFragmentToLatex(expr) !== null
  );
}

const setLatex = visionExpressionToLatex(
  "{-√2, 2,25, -1 3/4, -π/2, 3/8, 2,(37), √2}"
);
check("set element mixed number", setLatex.includes("-1\\,\\frac{3}{4}"));
check("set element pi fraction", setLatex.includes("\\frac{-\\pi}{2}"));
check("set element three eighths", setLatex.includes("\\frac{3}{8}"));
check("set element repeating decimal", setLatex.includes("2{,}\\overline{37}"));

const inlineNodes = inlineContentToInlineNodes(
  "Odpowiedź: tak lub 1/3 cm",
  [],
  (text) => ({ type: "text", text }),
  (latex) => ({ type: "math", latex })
);

check(
  "inline sentence keeps plain words",
  inlineNodes.filter((node) => node.type === "text").length >= 2
);
check(
  "inline sentence renders only fraction",
  inlineNodes.some(
    (node) => node.type === "math" && node.latex.includes("\\frac{1}{3}")
  ) &&
    inlineNodes.filter((node) => node.type === "math").length === 1
);
check(
  "cm stays plain text in sentence",
  inlineNodes.some((node) => node.type === "text" && node.text.includes("cm"))
);

check("hasMathSignals detects fraction", hasMathSignals("1/3"));
check("hasMathSignals rejects cm", !hasMathSignals("cm"));

const casesExpr =
  "f(x)=\\begin{cases} x+2 & \\text{dla } x \\in [-4,2] \\\\ -x+5 & \\text{dla } x \\in (2,5) \\end{cases}";
check("cases environment detected", containsLatexEnvironment(casesExpr));
check(
  "cases environment renders as display math",
  shouldRenderAsMath(casesExpr) && mathFragmentToLatex(casesExpr)?.includes("\\begin{cases}")
);
check(
  "cases inline node is single MathNode",
  inlineContentToInlineNodes(
    casesExpr,
    [],
    (text) => ({ type: "text", text }),
    (latex) => ({ type: "math", latex })
  ).filter((node) => node.type === "math").length === 1
);

const ocrGraphText = "Wykres funkcji y=f·x przedstawiono na rysunku.";
const ocrGraphNodes = inlineContentToInlineNodes(
  ocrGraphText,
  [],
  (text) => ({ type: "text", text }),
  (latex) => ({ type: "math", latex })
);
check(
  "OCR f·x normalized to f(x)",
  ocrGraphNodes.some(
    (node) => node.type === "text" && node.text.includes("f(x)") && !node.text.includes("f·x")
  )
);

for (const measurement of ["5,7 cm", "1,3 cm", "11,3 cm", "12 kg", "500 ml", "90°"]) {
  check(
    `measurement stays plain text: ${measurement}`,
    looksLikeMeasurement(measurement) &&
      looksLikePlainTextFragment(measurement) &&
      !shouldRenderAsMath(measurement)
  );
  check(
    `measurement has no latex: ${measurement}`,
    mathFragmentToLatex(measurement) === null
  );
}

const measurementInlineNodes = inlineContentToInlineNodes(
  "Długość wynosi 5,7 cm oraz 1,3 cm.",
  [],
  (text) => ({ type: "text", text }),
  (latex) => ({ type: "math", latex })
);

check(
  "measurements stay text in sentence",
  measurementInlineNodes.every((node) => node.type === "text") &&
    measurementInlineNodes.some((node) => node.text.includes("5,7 cm")) &&
    measurementInlineNodes.some((node) => node.text.includes("1,3 cm"))
);
check(
  "measurements are not split into multiplication",
  !measurementInlineNodes.some((node) => node.type === "math")
);

const measurementAnswerNodes = answerValueToInlineNodes("5,7 cm", "seed", {
  value: 0,
});
check(
  "answer measurement stays single text node",
  measurementAnswerNodes.length === 1 &&
    measurementAnswerNodes[0]?.type === "text" &&
    measurementAnswerNodes[0]?.text === "5,7 cm"
);

const semicolonSetLatex = visionExpressionToLatex(
  "{−√2,25; -1 3/4; -π/2; 2 3/8; 2,(37); √2}"
);
check(
  "semicolon set preserves decimal comma",
  semicolonSetLatex.includes("2{,}25") || semicolonSetLatex.includes("\\sqrt{2{,}25}")
);
check("semicolon set mixed number", semicolonSetLatex.includes("-1\\,\\frac{3}{4}"));
check(
  "semicolon set repeating decimal",
  semicolonSetLatex.includes("2{,}\\overline{37}")
);

if (failed) {
  process.exitCode = 1;
  console.log("\nSome math classification checks failed.");
} else {
  console.log("\nAll math classification checks passed.");
}
