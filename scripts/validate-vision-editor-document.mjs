/**
 * Unit tests for Vision → EditorDocument conversion (no API).
 */
import { visionExpressionToLatex } from "../app/lib/import/visionNotationToLatex.ts";
import {
  countMathNodes,
  normalizeVisionAnswers,
  visionExerciseToEditorDocuments,
} from "../app/lib/import/visionToEditorDocument.ts";
import { mergePazdroDualVisionExercises, parsePazdroIdentifierField } from "../app/lib/import/visionNormalize.ts";

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

const exercise141 = {
  identifier: "1.41",
  level: "extended",
  instruction:
    "Wykonaj działania, stosując prawo przemienności i łączności mnożenia:",
  subtasks: [
    {
      label: "a",
      expression: "(-1 3/4) · (-2,5) · 3 5/6 · (-6) · 4/7 · 2",
    },
    {
      label: "b",
      expression:
        "0,375 · 4 · √6 · (-1/√6) · (-0,25) · (-8)",
    },
    {
      label: "c",
      expression: "1/21 · 25/7 · 0,7 · 1/3,5 · (-7) · (-42/5)",
    },
    {
      label: "d",
      expression: "3,6 · (-1/2) · (-5/6) · 4 · 0,25",
    },
  ],
  answers: [
    { label: "a", value: "-115" },
    { label: "b", value: "-3" },
    { label: "c", value: "2" },
    { label: "d", value: "1,5" },
  ],
};

const latexA = visionExpressionToLatex(exercise141.subtasks[0].expression);
check("Mixed number in LaTeX", latexA.includes("-1\\,\\frac{3}{4}"), latexA);
check("Middle dot in LaTeX", latexA.includes("\\cdot"), latexA);

const latexB = visionExpressionToLatex(exercise141.subtasks[1].expression);
check("Square root in LaTeX", latexB.includes("\\sqrt{6}"), latexB);
check("Fraction over sqrt in LaTeX", latexB.includes("\\frac{-1}{\\sqrt{6}}"), latexB);

const documents = visionExerciseToEditorDocuments(exercise141, "test-141");
const taskDocument = documents.tresc;
const answerDocument = documents.odpowiedz;
const solutionDocument = documents.rozwiazanie;
const mathCount = countMathNodes(taskDocument);
const answerMathCount = countMathNodes(answerDocument);
const solutionMathCount = countMathNodes(solutionDocument);

check("Task has 4 subtask MathNodes", mathCount === 4, `count=${mathCount}`);
check("Answer field has 4 MathNodes", answerMathCount === 4, `count=${answerMathCount}`);
check("Solution field has 4 MathNodes", solutionMathCount === 4, `count=${solutionMathCount}`);
check(
  "Task content excludes answers",
  !taskDocument.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && /Odp/i.test(node.text)
    )
  )
);
check(
  "Answer field uses single inline paragraph",
  answerDocument.paragraphs.length === 1
);
check(
  "First answer label in inline block",
  answerDocument.paragraphs[0]?.children[0]?.type === "text" &&
    answerDocument.paragraphs[0].children[0].text === "a) "
);
check(
  "Second answer label spaced inline",
  answerDocument.paragraphs[0]?.children.some(
    (node) => node.type === "text" && node.text === "b) "
  )
);
check(
  "Solution field uses single inline paragraph",
  solutionDocument.paragraphs.length === 1
);
check(
  "Solution field matches answer layout",
  solutionDocument.paragraphs[0]?.children.some(
    (node) => node.type === "text" && node.text === "d) "
  )
);

const subtaskParagraph = taskDocument.paragraphs[1];
check(
  "Subtask paragraph starts with label TextNode",
  subtaskParagraph?.children[0]?.type === "text" &&
    subtaskParagraph.children[0].text === "a) ",
  JSON.stringify(subtaskParagraph?.children[0])
);
check(
  "Subtask paragraph has MathNode",
  subtaskParagraph?.children[1]?.type === "math",
  JSON.stringify(subtaskParagraph?.children[1])
);

const instructionParagraph = taskDocument.paragraphs[0];
check(
  "Instruction is plain TextNode",
  instructionParagraph?.children.length === 1 &&
    instructionParagraph.children[0]?.type === "text" &&
    !instructionParagraph.children[0].text.includes("\\frac"),
  instructionParagraph?.children[0]?.type === "text"
    ? instructionParagraph.children[0].text
    : ""
);

const exercise148 = {
  identifier: "1.148",
  level: "basic",
  instruction:
    "Pan Jan kupił samochód za 71 000 zł. Jego wartość co roku spada o 5%.",
  subtasks: [],
  answers: [{ label: "", value: "2840 zł" }],
};

const documents148 = visionExerciseToEditorDocuments(exercise148, "test-148");
const answer148 = documents148.odpowiedz;

check(
  "Single answer normalizes from empty label",
  normalizeVisionAnswers(exercise148).length === 1
);
check(
  "Single answer document has content",
  answer148.paragraphs[0]?.children.some(
    (node) =>
      (node.type === "math" && node.latex.includes("2840")) ||
      (node.type === "text" && node.text.includes("zł"))
  )
);
check(
  "Single answer has no a) label",
  !answer148.paragraphs[0]?.children.some(
    (node) => node.type === "text" && /^a\)/i.test(node.text)
  )
);
check("Single answer has one MathNode", countMathNodes(answer148) === 1);

const exercise148Percent = {
  ...exercise148,
  answers: [{ label: "", value: "12%" }],
};
const answerPercent = visionExerciseToEditorDocuments(
  exercise148Percent,
  "test-pct"
).odpowiedz;
check(
  "Percent answer preserved",
  answerPercent.paragraphs[0]?.children.some(
    (node) => node.type === "text" && node.text.includes("%")
  )
);

const exercise148Legacy = {
  ...exercise148,
  answers: [],
  answer: "2840 zł",
};
check(
  "Legacy answer field supported",
  normalizeVisionAnswers(exercise148Legacy).length === 1
);

const exercisePolishSubtasks = {
  identifier: "1.200",
  instruction: "Oblicz:",
  subtasks: [
    {
      label: "a",
      expression: "długość przekątnej kwadratu o boku 5 cm",
    },
    {
      label: "b",
      expression: "przybliżenie z nadmiarem liczby π",
    },
    {
      label: "c",
      expression: "(-1 3/4) · (-2,5)",
    },
  ],
  answers: [],
};

const polishDocuments = visionExerciseToEditorDocuments(
  exercisePolishSubtasks,
  "pl-text"
);
const polishTask = polishDocuments.tresc;

check(
  "Polish subtask phrase stays TextNode",
  polishTask.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "text" &&
        node.text.includes("długość przekątnej kwadratu")
    )
  )
);
check(
  "Polish subtask is not wrapped in MathNode",
  !polishTask.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "math" &&
        /długość|przekątnej|przybliżenie/i.test(node.latex)
    )
  )
);
check(
  "Math subtask still renders as MathNode",
  polishTask.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "math" && node.latex.includes("\\frac")
    )
  )
);

const exercise188 = {
  identifier: "1.188",
  level: "extended",
  instruction: "Wyznacz liczbę x, jeśli:",
  subtasks: [
    { label: "a", expression: "", mathElements: ["2x + 3 = 11"] },
    { label: "b", expression: "", mathElements: ["(x - 1)/3 = 2"] },
    { label: "c", expression: "", mathElements: ["x^2 - 4 = 0"] },
    { label: "d", expression: "", mathElements: ["|x + 2| = 5"] },
  ],
  answers: [
    { label: "a", value: "4" },
    { label: "b", value: "4" },
    { label: "c", value: "-2, 2" },
    { label: "d", value: "-3, 1" },
  ],
};

const documents188 = visionExerciseToEditorDocuments(exercise188, "test-188");

check(
  "Vision mathElements populate subtasks in EditorDocument",
  documents188.tresc.paragraphs.length === 5,
  `count=${documents188.tresc.paragraphs.length}`
);
check(
  "mathElements subtask a visible in task content",
  documents188.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.includes("2x + 3 = 11")
    )
  )
);
check(
  "mathElements exercise keeps answer subtasks",
  documents188.odpowiedz.paragraphs[0]?.children.some(
    (node) => node.type === "text" && node.text === "a) "
  )
);

const mergedDual = mergePazdroDualVisionExercises([
  {
    identifier: "1.171",
    level: "basic",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [{ label: "a", expression: "", mathElements: ["2x + 3 = 11"] }],
    answers: [{ label: "a", value: "4" }],
  },
  {
    identifier: "1.188",
    level: "extended",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [{ label: "a", expression: "", mathElements: ["2x + 3 = 11"] }],
    answers: [{ label: "a", value: "4" }],
  },
]);

check(
  "Dual Pazdro identifiers merge into one exercise",
  mergedDual.length === 1
);
check(
  "Merged exercise stores PP identifier",
  mergedDual[0]?.sourceIdentifierBasic === "1.171"
);
check(
  "Merged exercise stores PR identifier",
  mergedDual[0]?.sourceIdentifierExtended === "1.188"
);

const singlePr = parsePazdroIdentifierField("1.188");
check(
  "Single displayed number maps to both PP and PR",
  singlePr.identifikatorPp === "1.188" &&
    singlePr.identifikatorPr === "1.188"
);

const dualInline = parsePazdroIdentifierField("1.171   1.188");
check(
  "Dual inline numbers map to PP and PR",
  dualInline.identifikatorPp === "1.171" &&
    dualInline.identifikatorPr === "1.188"
);

const mergedSplitEntries = mergePazdroDualVisionExercises([
  {
    identifier: "1.171",
    level: "basic",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [
      { label: "a", expression: "", mathElements: ["2x + 3 = 11"] },
      { label: "b", expression: "", mathElements: ["(x - 1)/3 = 2"] },
      { label: "c", expression: "", mathElements: ["x^2 - 4 = 0"] },
      { label: "d", expression: "", mathElements: ["|x + 2| = 5"] },
    ],
    answers: [
      { label: "a", value: "4" },
      { label: "b", value: "4" },
      { label: "c", value: "-2, 2" },
      { label: "d", value: "-3, 1" },
    ],
  },
  {
    identifier: "1.188",
    level: "extended",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [],
    answers: [
      { label: "a", value: "4" },
      { label: "b", value: "4" },
      { label: "c", value: "-2, 2" },
      { label: "d", value: "-3, 1" },
    ],
  },
]);
const mergedSplitDocs = visionExerciseToEditorDocuments(
  mergedSplitEntries[0],
  "split-merge"
);

check(
  "Split PP/PR entries merge into one exercise",
  mergedSplitEntries.length === 1
);
check(
  "Merged split entries keep all subtasks",
  mergedSplitDocs.tresc.paragraphs.length === 5,
  `count=${mergedSplitDocs.tresc.paragraphs.length}`
);
check(
  "Merged split entries preserve PP identifier",
  mergedSplitEntries[0]?.sourceIdentifierBasic === "1.171"
);
check(
  "Merged split entries preserve PR identifier",
  mergedSplitEntries[0]?.sourceIdentifierExtended === "1.188"
);

const mergedUnknownLevels = mergePazdroDualVisionExercises([
  {
    identifier: "1.171",
    level: "unknown",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [
      { label: "a", expression: "", mathElements: ["2x + 3 = 11"] },
      { label: "b", expression: "", mathElements: ["(x - 1)/3 = 2"] },
      { label: "c", expression: "", mathElements: ["x^2 - 4 = 0"] },
      { label: "d", expression: "", mathElements: ["|x + 2| = 5"] },
    ],
    answers: [],
  },
  {
    identifier: "1.188",
    level: "unknown",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [],
    answers: [
      { label: "a", value: "4" },
      { label: "b", value: "4" },
      { label: "c", value: "-2, 2" },
      { label: "d", value: "-3, 1" },
    ],
  },
]);
const mergedUnknownDocs = visionExerciseToEditorDocuments(
  mergedUnknownLevels[0],
  "unknown-merge"
);

check(
  "Unknown-level PP/PR rows merge into one exercise",
  mergedUnknownLevels.length === 1
);
check(
  "Unknown-level merge keeps all subtasks",
  mergedUnknownDocs.tresc.paragraphs.length === 5,
  `count=${mergedUnknownDocs.tresc.paragraphs.length}`
);
check(
  "Unknown-level merge assigns PP from first number",
  mergedUnknownLevels[0]?.sourceIdentifierBasic === "1.171"
);
check(
  "Unknown-level merge assigns PR from second number",
  mergedUnknownLevels[0]?.sourceIdentifierExtended === "1.188"
);

const mergedDualInlineWithSibling = mergePazdroDualVisionExercises([
  {
    identifier: "1.171 1.188",
    level: "extended",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [],
    answers: [
      { label: "a", value: "4" },
      { label: "b", value: "4" },
      { label: "c", value: "-2, 2" },
      { label: "d", value: "-3, 1" },
    ],
  },
  {
    identifier: "1.171",
    level: "unknown",
    instruction: "Wyznacz liczbę x, jeśli:",
    subtasks: [
      { label: "a", expression: "", mathElements: ["2x + 3 = 11"] },
      { label: "b", expression: "", mathElements: ["(x - 1)/3 = 2"] },
      { label: "c", expression: "", mathElements: ["x^2 - 4 = 0"] },
      { label: "d", expression: "", mathElements: ["|x + 2| = 5"] },
    ],
    answers: [],
  },
]);
const mergedDualInlineDocs = visionExerciseToEditorDocuments(
  mergedDualInlineWithSibling[0],
  "dual-inline-sibling"
);

check(
  "Dual-inline row merges with sibling subtask row",
  mergedDualInlineWithSibling.length === 1
);
check(
  "Dual-inline merge borrows subtasks from sibling row",
  mergedDualInlineDocs.tresc.paragraphs.length === 5,
  `count=${mergedDualInlineDocs.tresc.paragraphs.length}`
);

const exercise171Text = {
  identifier: "1.171 1.188",
  level: "extended",
  instruction: "Wyznacz liczbę x, jeśli:",
  subtasks: [
    {
      label: "a",
      text: "przybliżenie z nadmiarem liczby x jest równe 13,6; błąd względny tego przybliżenia wynosi 0,00369",
      mathElements: ["13,6", "0,00369"],
    },
    {
      label: "b",
      text: "przybliżenie z niedoborem liczby x jest równe 24,1; błąd względny tego przybliżenia wynosi 0,00166",
      mathElements: ["24,1", "0,00166"],
    },
  ],
  answers: [
    { label: "a", value: "13,55" },
    { label: "b", value: "24,14" },
  ],
};
const documents171Text = visionExerciseToEditorDocuments(
  exercise171Text,
  "text-subtask"
);

check(
  "Type B subtasks produce instruction + sentence paragraphs",
  documents171Text.tresc.paragraphs.length === 3,
  `count=${documents171Text.tresc.paragraphs.length}`
);
check(
  "Type B subtask keeps Polish sentence in TextNode",
  documents171Text.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "text" &&
        node.text.includes("przybliżenie z nadmiarem liczby x")
    )
  )
);
check(
  "Type B subtask renders inline values as MathNodes",
  documents171Text.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "math" && node.latex.includes("13{,}6")
    )
  )
);
check(
  "Type B subtask does not wrap whole sentence in one MathNode",
  !documents171Text.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "math" &&
        /przybliżenie|błąd względny/i.test(node.latex)
    )
  )
);

const exercise174 = {
  identifier: "1.174 1.191",
  instruction: "Porównaj liczby x i y (nie używając kalkulatora):",
  subtasks: [
    {
      label: "a",
      expression: "x = 2√3−1/6 oraz y = 1/2",
    },
    {
      label: "b",
      expression: "x = (4+3√5)/9 oraz y = 1,5",
    },
  ],
  answers: [],
};
const documents174 = visionExerciseToEditorDocuments(exercise174, "174");

check(
  "Mixed x/y subtask renders complex fraction as MathNode",
  documents174.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "math" &&
        node.latex.includes("\\frac{2\\sqrt{3} - 1}{6}")
    )
  )
);
check(
  "Mixed x/y subtask keeps variable labels as TextNode",
  documents174.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.includes("x =")
    )
  )
);

const exercise175Text = {
  identifier: "1.175 1.192",
  instruction: "Nie używając kalkulatora sprawdź, czy:",
  subtasks: [
    {
      label: "a",
      text: "liczba (8√3−5)/6 należy do przedziału (1/2, 5/6)",
      mathElements: ["(8√3−5)/6", "(1/2, 5/6)"],
    },
  ],
  answers: [],
};
const documents175Text = visionExerciseToEditorDocuments(
  exercise175Text,
  "175-text"
);

check(
  "Type B interval endpoints render as MathNodes",
  documents175Text.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) =>
        node.type === "math" &&
        node.latex.includes("\\frac{1}{2}") &&
        node.latex.includes("\\frac{5}{6}")
    )
  )
);

const exerciseIntervalInstruction = {
  identifier: "1.200",
  instruction:
    "Zaznacz na osi liczbowej przedziały: A = (-4, 3 1/2), B = (1/3, 6). Następnie podaj:",
  subtasks: [
    {
      label: "a",
      text: "najmniejszą liczbę naturalną, która należy do zbioru A ∪ B",
      mathElements: ["(-4, 3 1/2)", "(1/3, 6)", "A ∪ B"],
    },
  ],
  answers: [],
};
const documentsIntervalInstruction = visionExerciseToEditorDocuments(
  exerciseIntervalInstruction,
  "interval-instruction"
);
const intervalInstructionParagraph = documentsIntervalInstruction.tresc.paragraphs[0];

check(
  "Instruction with interval assignments renders MathNodes",
  intervalInstructionParagraph?.children.some(
    (node) =>
      node.type === "math" &&
      node.latex.includes("A =") &&
      node.latex.includes("3\\,\\frac{1}{2}")
  ) &&
    intervalInstructionParagraph?.children.some(
      (node) =>
        node.type === "math" &&
        node.latex.includes("B =") &&
        node.latex.includes("\\frac{1}{3}")
    )
);
check(
  "Subtask with named set union renders MathNode",
  documentsIntervalInstruction.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "math" && node.latex.includes("\\cup")
    )
  )
);

const exerciseSetInstruction = {
  identifier: "21",
  instruction:
    "Dany jest zbiór A = {-√2, 2.25, -1 3/4, -π/2, 3/8, √2}. Wypisz:",
  subtasks: [{ label: "a", text: "liczby niewymierne", mathElements: [] }],
  answers: [{ label: "a", value: "√2; -π/2" }],
};
const documentsSetInstruction = visionExerciseToEditorDocuments(
  exerciseSetInstruction,
  "set-instruction"
);
const setInstructionParagraph = documentsSetInstruction.tresc.paragraphs[0];

check(
  "Set instruction renders assignment with fractions and pi",
  setInstructionParagraph?.children.some(
    (node) =>
      node.type === "math" &&
      node.latex.includes("A =") &&
      node.latex.includes("\\frac{-\\pi}{2}") &&
      node.latex.includes("\\frac{3}{8}")
  )
);

const exerciseCkeInlineSentence = {
  identifier: "7",
  exerciseKind: "multiple_choice",
  instruction: "Dokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.",
  question: "Rozwiązaniem równania\n\n√2\n\njest liczba",
  choices: [
    { label: "A", text: "2" },
    { label: "B", text: "3" },
    { label: "C", text: "4" },
    { label: "D", text: "5" },
  ],
  subtasks: [],
  answers: [{ label: "", value: "C" }],
};
const documentsCkeInline = visionExerciseToEditorDocuments(
  exerciseCkeInlineSentence,
  "cke-inline"
);
const ckeBodyParagraphs = documentsCkeInline.tresc.paragraphs.filter(
  (paragraph) =>
    paragraph.children.every(
      (node) => node.type === "text" || node.type === "math"
    ) &&
    !paragraph.children.some(
      (node) => node.type === "text" && /\bA\.\s/.test(node.text)
    )
);
const inlineSentenceParagraph = ckeBodyParagraphs.find((paragraph) =>
  paragraph.children.some(
    (node) =>
      node.type === "text" && node.text.includes("Rozwiązaniem równania")
  )
);

check(
  "Y-sorted CKE sentence merges into one paragraph",
  ckeBodyParagraphs.length === 2,
  `bodyParagraphCount=${ckeBodyParagraphs.length}`
);
check(
  "Inline sentence keeps prefix text before equation",
  inlineSentenceParagraph?.children.some(
    (node) =>
      node.type === "text" && node.text.includes("Rozwiązaniem równania")
  )
);
check(
  "Inline sentence renders equation as MathNode",
  inlineSentenceParagraph?.children.some((node) => node.type === "math")
);
check(
  "Inline sentence keeps suffix text after equation",
  inlineSentenceParagraph?.children.some(
    (node) => node.type === "text" && node.text.includes("jest liczba")
  )
);

const { MC_OPTION_SEPARATOR } = await import(
  "../app/lib/import/multipleChoiceDetect.ts"
);
const mcParagraph = documentsCkeInline.tresc.paragraphs.find((paragraph) =>
  paragraph.children.some(
    (node) => node.type === "text" && node.text.includes("A.")
  )
);
const mcSeparatorCount = mcParagraph?.children.filter(
  (node) => node.type === "text" && node.text === MC_OPTION_SEPARATOR
).length;

check(
  "CKE ABCD options use tripled separator spacing",
  MC_OPTION_SEPARATOR.length === 24,
  `separatorLength=${MC_OPTION_SEPARATOR.length}`
);
check(
  "Multiple-choice paragraph includes widened separators",
  (mcSeparatorCount ?? 0) >= 2,
  `separatorCount=${mcSeparatorCount ?? 0}`
);

const exerciseCkeInlineLatex = {
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
const documentsCkeInlineLatex = visionExerciseToEditorDocuments(
  exerciseCkeInlineLatex,
  "cke-inline-latex"
);
const ckeLatexNodes = documentsCkeInlineLatex.tresc.paragraphs.flatMap(
  (paragraph) => paragraph.children
);

check(
  "Inline LaTeX fraction becomes MathNode",
  ckeLatexNodes.some(
    (node) => node.type === "math" && node.latex === "\\frac{25}{8}"
  )
);
check(
  "Inline LaTeX sqrt becomes MathNode",
  ckeLatexNodes.some(
    (node) => node.type === "math" && node.latex === "\\sqrt{2}"
  )
);
check(
  "Inline LaTeX superscript choice becomes MathNode",
  ckeLatexNodes.some(
    (node) => node.type === "math" && node.latex === "2^{-1}"
  )
);
check(
  "Inline LaTeX does not misparse brace groups as sets",
  !ckeLatexNodes.some(
    (node) => node.type === "math" && node.latex.includes("\\left\\{25\\right\\}")
  )
);

console.log("\nSample subtask LaTeX:", subtaskParagraph?.children[1]?.type === "math"
  ? subtaskParagraph.children[1].latex
  : "missing");
