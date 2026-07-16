/**
 * CKE import pipeline regression suite (Vision → EditorDocument).
 *
 * Runs without OpenAI when using fixture JSON snapshots.
 * Live Vision tests require OPENAI_API_KEY + CKE_IMPORT_LIVE_VISION=1.
 *
 * Usage:
 *   npm run test:cke-import                              # full offline regression
 *   npm run test:cke-import -- 18                        # task 18 fixtures only
 *   npm run test:cke-import -- true-false                # P/F fixture only
 *   npm run test:cke-import -- task-18-mc                # single fixture
 *   npm run test:cke-import -- --filter true-false
 *   CKE_IMPORT_FILTER=matching npm run test:cke-import
 *   CKE_IMPORT_SCOPE=geometry npm run test:cke-import    # env alias (same as filter)
 *   CKE_IMPORT_LIVE_VISION=1 npm run test:cke-import     # final live check (full suite)
 *   CKE_IMPORT_STRICT_KNOWN=1 npm run test:cke-import    # fail on known regressions too
 */
import { existsSync, readFileSync } from "node:fs";

import {
  applyCkeSourceIdentifiers,
  buildCkeSourceIdentifier,
  isCkeSourceIdentifier,
} from "../app/lib/import/ckeIdentifier.ts";
import {
  assertCkeVisionAvailable,
  ckeVisionModeWarning,
  shouldAllowCkeTextParserFallback,
  shouldUseVisionForCkeImport,
} from "../app/lib/import/ckeImportRouting.ts";
import {
  assertLiveVisionEnabled,
  getVisionMode,
  isLiveVisionEnabled,
} from "../app/lib/import/visionLiveMode.ts";
import {
  extractExercisesFromPageImageMock,
  listVisionFixtureNames,
  loadVisionFixtureByName,
  resetVisionFixtureCache,
} from "../app/lib/import/visionMock.ts";
import { cropFigureFromPage } from "../app/lib/import/pdfImageCrop.ts";
import { attachFiguresToExercise } from "../app/lib/import/visionFigureAttach.ts";
import {
  countImageNodes,
  countMathNodes,
  visionExerciseSuggestedTyp,
  visionExerciseToEditorDocuments,
} from "../app/lib/import/visionToEditorDocument.ts";
import { mergeCkeVisionExercises } from "../app/lib/import/maturaParser.ts";
import { normalizeVisionExercise } from "../app/lib/import/visionNormalize.ts";
import {
  collectMathLatex,
  compareStructure,
  createSuite,
  DEFAULT_CKE_PDF,
  documentContainsText,
  documentPlainText,
  documentToStructure,
  findParagraphIndex,
  imageParagraphIndex,
  inlineNodeToShape,
  loadExpectedStructure,
  loadVisionFixture,
  liveVisionEnabled,
  paragraphContainsText,
  paragraphSignatures,
  trueFalseTableParagraph,
  matchingTableParagraph,
  loadEnvFile,
} from "./lib/cke-import-test-harness.mjs";
import { parseCkeImportScope } from "./lib/cke-import-scope.mjs";

loadEnvFile();

const scope = parseCkeImportScope(process.argv.slice(2));
if (scope.active) {
  console.log(`\nScoped CKE import tests: ${scope.describe()}\n`);
}

const { check, section, summary } = createSuite(
  scope.active ? "CKE import regression (scoped)" : "CKE import regression"
);

function runSection(title, tags, body) {
  if (scope.matches(...tags)) {
    section(title);
    body();
  }
}

function runIf(tags, body) {
  if (scope.matches(...tags)) {
    body();
  }
}

function docsFromFixture(name) {
  const exercise = loadVisionFixture(name);
  return {
    exercise,
    docs: visionExerciseToEditorDocuments(exercise, name),
  };
}

function assertStructureMatchesFixture(name) {
  if (!scope.matches(name)) return;
  const { docs } = docsFromFixture(name);
  const expected = loadExpectedStructure(name);
  const actual = {
    fixture: name,
    tresc: documentToStructure(docs.tresc),
    odpowiedz: documentToStructure(docs.odpowiedz),
  };
  const trescCmp = compareStructure(actual.tresc, expected.tresc);
  const ansCmp = compareStructure(actual.odpowiedz, expected.odpowiedz);
  check(
    `${name}: tresc structure matches snapshot`,
    trescCmp.ok,
    trescCmp.ok ? "" : `diff at ${trescCmp.diff?.length ?? 0} paragraph(s)`
  );
  check(
    `${name}: odpowiedz structure matches snapshot`,
    ansCmp.ok,
    ansCmp.ok ? "" : `diff at ${ansCmp.diff?.length ?? 0} paragraph(s)`
  );
}

// ── 0. Vision-first routing ─────────────────────────────────────────────────
if (scope.matches("core", "routing")) {
  section("0. Vision-first CKE routing");
  const CKE_ROUTING_SAMPLE = [
    "Zadanie 1. Przykładowe zadanie.",
    "Zadanie 18. Arkusz maturalny z matematyki poziom podstawowy",
  ].join("\n");

  check(
    "CKE PDF routes to Vision (mock or live, no API key required)",
    shouldUseVisionForCkeImport(CKE_ROUTING_SAMPLE, "matura_maj_2026_PP.pdf")
  );

{
  const savedKey = process.env.OPENAI_API_KEY;
  const savedLive = process.env.CKE_IMPORT_LIVE_VISION;
  delete process.env.OPENAI_API_KEY;
  delete process.env.CKE_IMPORT_LIVE_VISION;

  let ckeThrew = false;
  try {
    assertCkeVisionAvailable(CKE_ROUTING_SAMPLE, "matura.pdf");
  } catch {
    ckeThrew = true;
  }

  check(
    "CKE without API key uses mock Vision (no throw)",
    !ckeThrew
  );

  check(
    "CKE mock mode warning when live Vision not enabled",
    Boolean(ckeVisionModeWarning(CKE_ROUTING_SAMPLE, "matura.pdf"))
  );

  let nonCkeThrew = false;
  try {
    assertCkeVisionAvailable("Ćwiczenie 1.41", "pazdro.pdf");
  } catch {
    nonCkeThrew = true;
  }
  check("Non-CKE PDF does not require Vision", !nonCkeThrew);

  if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  if (savedLive) process.env.CKE_IMPORT_LIVE_VISION = savedLive;
}

{
  const savedKey = process.env.OPENAI_API_KEY;
  const savedLive = process.env.CKE_IMPORT_LIVE_VISION;
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.CKE_IMPORT_LIVE_VISION;

  check("Default vision mode is mock (not live)", getVisionMode() === "mock");
  check("Live Vision disabled without CKE_IMPORT_LIVE_VISION=1", !isLiveVisionEnabled());

  let liveBlocked = false;
  try {
    assertLiveVisionEnabled("test");
  } catch {
    liveBlocked = true;
  }
  check("assertLiveVisionEnabled blocks API without opt-in", liveBlocked);

  if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  else delete process.env.OPENAI_API_KEY;
  if (savedLive) process.env.CKE_IMPORT_LIVE_VISION = savedLive;
}

{
  const savedPages = process.env.CKE_IMPORT_MOCK_PAGES;
  process.env.CKE_IMPORT_MOCK_PAGES = "1:task-18-mc;task-pf";
  resetVisionFixtureCache();

  const mockPage = extractExercisesFromPageImageMock(1);
  check(
    "Mock Vision returns mapped fixtures for page 1",
    mockPage.exercises.length === 2 &&
      mockPage.exercises.some((ex) => ex.identifier === "18") &&
      mockPage.exercises.some((ex) => ex.exerciseKind === "true_false")
  );

  const emptyPage = extractExercisesFromPageImageMock(99);
  check(
    "Mock Vision returns empty for unmapped pages",
    emptyPage.exercises.length === 0
  );

  check(
    "Vision fixtures are loadable offline",
    listVisionFixtureNames().length >= 10 &&
      loadVisionFixtureByName("task-18-mc")?.identifier === "18"
  );

  if (savedPages) process.env.CKE_IMPORT_MOCK_PAGES = savedPages;
  else delete process.env.CKE_IMPORT_MOCK_PAGES;
  resetVisionFixtureCache();
}

{
  const savedKey = process.env.OPENAI_API_KEY;
  const savedLive = process.env.CKE_IMPORT_LIVE_VISION;
  delete process.env.OPENAI_API_KEY;
  delete process.env.CKE_IMPORT_LIVE_VISION;

  const { extractExercisesFromPageImage } = await import(
    "../app/lib/import/visionExtract.ts"
  );
  const mockResult = await extractExercisesFromPageImage(Buffer.alloc(0), 1);
  check(
    "extractExercisesFromPageImage uses mock without live opt-in",
    mockResult.sourcePage === "mock-page-1" && mockResult.exercises.length === 0
  );

  if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  if (savedLive) process.env.CKE_IMPORT_LIVE_VISION = savedLive;
}

  check(
    "Text parser fallback only on pdf-text extraction",
    shouldAllowCkeTextParserFallback("pdf-text") &&
      !shouldAllowCkeTextParserFallback("vision")
  );
}

// ── 1. Reading order ────────────────────────────────────────────────────────
runSection("1. Reading order", [
  "reading-order",
  "task-context-mc",
  "task-18-inline-sentence",
  "task-zapisz-obliczenia",
  "task-image-reading-order",
  "multiple-choice",
  "inline-math",
  "open",
  "image",
  "graph",
  "18",
], () => {

runIf(["task-context-mc", "multiple-choice", "reading-order"], () => {
  const { docs } = docsFromFixture("task-context-mc");
  const tresc = docs.tresc;
  const contextIdx = findParagraphIndex(tresc, (p) =>
    paragraphContainsText(p, "Anna wpłaciła")
  );
  const instructionIdx = findParagraphIndex(tresc, (p) =>
    paragraphContainsText(p, "Dokończ zadanie")
  );
  const questionIdx = findParagraphIndex(tresc, (p) =>
    paragraphContainsText(p, "Po dwóch latach")
  );
  const choicesIdx = findParagraphIndex(tresc, (p) =>
    paragraphContainsText(p, "A.")
  );

  check(
    "Context appears before instruction",
    contextIdx >= 0 && instructionIdx > contextIdx,
    `context=${contextIdx} instruction=${instructionIdx}`
  );
  check(
    "Instruction appears before final question",
    instructionIdx >= 0 && questionIdx > instructionIdx,
    `instruction=${instructionIdx} question=${questionIdx}`
  );
  check(
    "Final question appears before ABCD choices",
    questionIdx >= 0 && choicesIdx > questionIdx,
    `question=${questionIdx} choices=${choicesIdx}`
  );
  check(
    "Context/instruction/question are separate paragraphs",
    tresc.paragraphs.length >= 4
  );
});

runIf(["task-18-inline-sentence", "inline-math", "18"], () => {
  const { docs } = docsFromFixture("task-18-inline-sentence");
  const bodyParagraphs = docs.tresc.paragraphs.filter(
    (paragraph) =>
      paragraph.children.every(
        (node) => node.type === "text" || node.type === "math"
      ) &&
      !paragraphContainsText(paragraph, "A.") &&
      !paragraphContainsText(paragraph, "B.") &&
      !paragraphContainsText(paragraph, "C.") &&
      !paragraphContainsText(paragraph, "D.")
  );
  const inlineParagraph = bodyParagraphs.find((paragraph) =>
    paragraphContainsText(paragraph, "Rozwiązaniem równania")
  );

  check(
    "Y-sorted inline sentence coalesces to one paragraph",
    bodyParagraphs.length === 2,
    `bodyParagraphCount=${bodyParagraphs.length}`
  );
  check(
    "Prefix text stays before equation",
    inlineParagraph?.children.some(
      (node) =>
        node.type === "text" && node.text.includes("Rozwiązaniem równania")
    )
  );
  check(
    "Equation renders as MathNode inside sentence",
    inlineParagraph?.children.some((node) => node.type === "math")
  );
  check(
    "Suffix text stays after equation",
    inlineParagraph?.children.some(
      (node) => node.type === "text" && node.text.includes("jest liczba")
    )
  );
});

runIf(["task-zapisz-obliczenia", "open", "reading-order"], () => {
  const { docs } = docsFromFixture("task-zapisz-obliczenia");
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Oblicz wartość")
  );
  const zapiszIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Zapisz obliczenia")
  );
  const subtaskIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "a)")
  );

  check(
    "Instruction precedes Zapisz obliczenia",
    instructionIdx >= 0 && zapiszIdx > instructionIdx,
    `instruction=${instructionIdx} zapisz=${zapiszIdx}`
  );
  check(
    "Zapisz obliczenia precedes subtask with equation",
    zapiszIdx >= 0 && subtaskIdx > zapiszIdx,
    `zapisz=${zapiszIdx} subtask=${subtaskIdx}`
  );
  check(
    "Equation math appears in subtask, not before Zapisz obliczenia",
    docs.tresc.paragraphs
      .slice(0, zapiszIdx + 1)
      .every((paragraph) =>
        paragraph.children.every(
          (node) =>
            node.type !== "math" ||
            !node.latex.includes("\\frac{25}{8}")
        )
      )
  );
});

runIf(["task-image-reading-order", "graph", "image", "reading-order"], () => {
  const fixture = loadVisionFixture("task-image-reading-order");
  const bodyBlocksExercise = {
    ...fixture,
    bodyBlocks: [fixture.context, fixture.instruction, fixture.question].filter(
      Boolean
    ),
    context: undefined,
    instruction: "",
    question: undefined,
  };
  const docs = visionExerciseToEditorDocuments(
    bodyBlocksExercise,
    "image-body-blocks"
  );
  const imgIdx = imageParagraphIndex(docs.tresc);
  const contextIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "wykres funkcji f")
  );
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Odczytaj wartość")
  );
  const questionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Zapisz obliczenia")
  );

  check(
    "bodyBlocks: context precedes instruction",
    contextIdx >= 0 && instructionIdx > contextIdx,
    `context=${contextIdx} instruction=${instructionIdx}`
  );
  check(
    "bodyBlocks: figure immediately after instruction paragraph",
    imgIdx === instructionIdx + 1,
    `instruction=${instructionIdx} image=${imgIdx} question=${questionIdx}`
  );
  check(
    "bodyBlocks: figure before Zapisz obliczenia closing line",
    imgIdx >= 0 && questionIdx > imgIdx,
    `image=${imgIdx} zapisz=${questionIdx}`
  );
});

runIf(["task-zapisz-obliczenia", "open", "reading-order"], () => {
  const fixture = loadVisionFixture("task-zapisz-obliczenia");
  const bodyBlocksExercise = {
    ...fixture,
    bodyBlocks: [fixture.instruction, fixture.question].filter(Boolean),
    instruction: "",
    question: undefined,
  };
  const docs = visionExerciseToEditorDocuments(
    bodyBlocksExercise,
    "zapisz-body-blocks"
  );
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Oblicz wartość")
  );
  const zapiszIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Zapisz obliczenia")
  );
  const subtaskIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "a)")
  );

  check(
    "bodyBlocks: instruction precedes Zapisz obliczenia",
    instructionIdx >= 0 && zapiszIdx > instructionIdx,
    `instruction=${instructionIdx} zapisz=${zapiszIdx}`
  );
  check(
    "bodyBlocks: Zapisz obliczenia precedes subtask",
    zapiszIdx >= 0 && subtaskIdx > zapiszIdx,
    `zapisz=${zapiszIdx} subtask=${subtaskIdx}`
  );
});
});

// ── 2. Inline mathematics → MathNodes ───────────────────────────────────────
runSection("2. Inline mathematics → MathNodes", [
  "inline-math",
  "task-18-mc",
  "task-intervals-sets",
  "task-set-instruction",
  "task-12-fill-numbers",
  "task-12-fill-intervals",
  "fill-blank",
  "12",
  "18",
], () => {

runIf(["task-18-mc", "inline-math", "multiple-choice", "18"], () => {
  const { docs } = docsFromFixture("task-18-mc");
  const latex = collectMathLatex(docs.tresc);

  for (const expected of [
    "\\frac{25}{8}",
    "\\sqrt{2}",
    "2^{-1}",
    "4^{12}",
    "5^{24}",
  ]) {
    check(
      `task-18-mc: MathNode ${expected}`,
      latex.includes(expected),
      `found=${latex.filter((l) => l.includes(expected.slice(0, 6))).join(", ")}`
    );
  }

  check(
    "task-18-mc: no false set-literal brace parsing",
    !latex.some((l) => l.includes("\\left\\{25\\right\\}"))
  );
});

runIf(["task-intervals-sets", "inline-math"], () => {
  const { docs } = docsFromFixture("task-intervals-sets");
  const latex = collectMathLatex(docs.tresc);

  check(
    "Intervals: mixed number in A assignment",
    latex.some(
      (l) => l.includes("A =") && l.includes("3\\,\\frac{1}{2}")
    )
  );
  check(
    "Intervals: B assignment with fraction",
    latex.some((l) => l.includes("B =") && l.includes("\\frac{1}{3}"))
  );
  check(
    "Sets: union operator in subtask",
    latex.some((l) => l.includes("\\cup"))
  );
});

runIf(["task-set-instruction", "inline-math"], () => {
  const { docs } = docsFromFixture("task-set-instruction");
  const latex = collectMathLatex(docs.tresc);

  check(
    "Set instruction: pi fraction",
    latex.some((l) => l.includes("\\frac{-\\pi}{2}"))
  );
  check(
    "Set instruction: rational fraction 3/8",
    latex.some((l) => l.includes("\\frac{3}{8}"))
  );
  check(
    "Set instruction: sqrt2 elements",
    latex.some((l) => l.includes("\\sqrt{2}"))
  );
});

runIf(["task-12-fill-numbers", "fill-blank", "12"], () => {
  const raw = loadVisionFixture("task-12-fill-numbers");
  const exercise = normalizeVisionExercise(raw);
  const { docs } = docsFromFixture("task-12-fill-numbers");
  const latex = collectMathLatex(docs.tresc);

  check(
    "Fill numbers: exerciseKind fill_blank",
    exercise.exerciseKind === "fill_blank"
  );
  check(
    "Fill numbers: suggested typ uzupelnij",
    visionExerciseSuggestedTyp(exercise) === "uzupelnij"
  );
  check(
    "Fill numbers: f(x)=3 as MathNode",
    latex.some((l) => l.includes("f(x)=3"))
  );
  check(
    "Fill numbers: interval [2,3] as MathNode",
    latex.some((l) => l.includes("\\left[2") && l.includes("3\\right]"))
  );
  check(
    "Fill numbers: dot placeholders become \\placeholder{}",
    latex.filter((l) => l.includes("\\placeholder{}")).length >= 2
  );
  check(
    "Fill numbers: no raw dot runs in tresc",
    !documentPlainText(docs.tresc).includes("……")
  );

  assertStructureMatchesFixture("task-12-fill-numbers");
});

runIf(["task-12-fill-intervals", "fill-blank", "12"], () => {
  const raw = loadVisionFixture("task-12-fill-intervals");
  const exercise = normalizeVisionExercise(raw);
  const { docs } = docsFromFixture("task-12-fill-intervals");
  const latex = collectMathLatex(docs.tresc);

  check(
    "Fill intervals: exerciseKind fill_blank",
    exercise.exerciseKind === "fill_blank"
  );
  check(
    "Fill intervals: suggested typ uzupelnij",
    visionExerciseSuggestedTyp(exercise) === "uzupelnij"
  );
  check(
    "Fill intervals: interval placeholder MathNodes",
    latex.filter((l) => l.includes("\\placeholder{}")).length >= 2
  );
  check(
    "Fill intervals: bracket interval template",
    latex.some(
      (l) =>
        l.includes("\\left[\\placeholder{}") &&
        l.includes("\\placeholder{}\\right]")
    )
  );
  check(
    "Fill intervals: math count > 0 in subtasks",
    countMathNodes(docs.tresc) >= 3
  );
  check(
    "Fill intervals: no raw dot runs in tresc",
    !documentPlainText(docs.tresc).includes("……")
  );

  assertStructureMatchesFixture("task-12-fill-intervals");
});
});

// ── 3. Display math — standalone equations ──────────────────────────────────
runSection("3. Display math — standalone equations", [
  "display-math",
  "task-display-math",
  "task-12-graph",
  "graph",
], () => {
  const { docs } = docsFromFixture("task-display-math");
  const subtaskParagraph = docs.tresc.paragraphs.find((p) =>
    paragraphContainsText(p, "a)")
  );
  const hasEquationMath = subtaskParagraph?.children.some(
    (node) => node.type === "math" && node.latex.includes("2x + 3 = 11")
  );
  const sigs = paragraphSignatures(docs.tresc);

  check(
    "Display math: standalone equation renders as MathNode",
    hasEquationMath
  );
  check(
    "Display math: instruction + subtasks preserved",
    sigs.length >= 3,
    `paragraphCount=${sigs.length}`
  );
  check(
    "Display math: multiple equations in separate subtasks",
    docs.tresc.paragraphs.filter((p) => paragraphContainsText(p, "a)") || paragraphContainsText(p, "b)"))
      .length === 2
  );

  runIf(["task-12-graph", "graph"], () => {
    const task12 = docsFromFixture("task-12-graph");
    const casesParagraph = task12.docs.tresc.paragraphs.find((p) =>
      p.children.some(
        (node) =>
          node.type === "math" && node.latex.includes("\\begin{cases}")
      )
    );
    const graphParagraph = task12.docs.tresc.paragraphs.find((p) =>
      paragraphContainsText(p, "Wykres funkcji y=f(x)")
    );

    check(
      "Task 12: piecewise cases environment is a MathNode",
      Boolean(casesParagraph)
    );
    check(
      "Task 12: OCR f·x normalized to f(x) in graph sentence",
      Boolean(graphParagraph) &&
        !documentPlainText(task12.docs.tresc).includes("f·x")
    );

    assertStructureMatchesFixture("task-12-graph");
  });
});

// ── 4. Multiple-choice structure ────────────────────────────────────────────
runSection("4. Multiple-choice — A/B/C/D structure", [
  "multiple-choice",
  "task-18-mc",
  "task-context-mc",
  "18",
], () => {
  const { exercise, docs } = docsFromFixture("task-18-mc");

  check("MC: detected as wybor-wielokrotny", visionExerciseSuggestedTyp(exercise) === "wybor-wielokrotny");
  check(
    "MC: A/B/C/D on one inline paragraph",
    docs.tresc.paragraphs.filter((p) => paragraphContainsText(p, "A.")).length === 1 &&
      docs.tresc.paragraphs.filter((p) => paragraphContainsText(p, "D.")).length === 1
  );
  check(
    "MC: answer stored separately",
    docs.odpowiedz.paragraphs[0]?.children[0]?.type === "text" &&
      docs.odpowiedz.paragraphs[0].children[0].text === "A"
  );

  const choiceParagraphs = docs.tresc.paragraphs.filter((p) =>
    ["A.", "B.", "C.", "D."].some((label) => paragraphContainsText(p, label))
  );

  check(
    "MC: single inline choice paragraph",
    choiceParagraphs.length === 1,
    `choiceParagraphCount=${choiceParagraphs.length}`
  );
  check(
    "MC: choice superscripts are MathNodes not plain text",
    choiceParagraphs[0]?.children.some(
      (node) => node.type === "math" && node.latex === "2^{-1}"
    )
  );
  check(
    "MC: widened separators between inline options",
    (choiceParagraphs[0]?.children.filter(
      (node) => node.type === "text" && node.text.length === 24
    ).length ?? 0) >= 2
  );

  runIf(["task-18-mc", "multiple-choice", "18"], () => {
    assertStructureMatchesFixture("task-18-mc");
  });
  runIf(["task-context-mc", "multiple-choice", "reading-order"], () => {
    assertStructureMatchesFixture("task-context-mc");
  });
});

// ── 5. True/False — structured table ───────────────────────────────────────
runSection("5. True/False — true-false-table node", [
  "true-false",
  "task-pf",
], () => {
  const { exercise, docs } = docsFromFixture("task-pf");
  const pfParagraph = trueFalseTableParagraph(docs.tresc);
  const tableNode = pfParagraph?.children.find(
    (node) => node.type === "true-false-table"
  );

  check(
    "P/F: detected as prawda-falsz",
    visionExerciseSuggestedTyp(exercise) === "prawda-falsz"
  );
  check("P/F: true-false-table node present", Boolean(pfParagraph));
  check(
    "P/F: CKE layout cke-prawda-falsz",
    tableNode?.type === "true-false-table" &&
      tableNode.layout === "cke-prawda-falsz"
  );
  check(
    "P/F: three statement rows",
    tableNode?.type === "true-false-table" && tableNode.rows.length === 3
  );
  check(
    "P/F: statements are inline nodes not flat text",
    tableNode?.type === "true-false-table" &&
      tableNode.rows.every(
        (row) =>
          Array.isArray(row.statement) &&
          row.statement.some((node) => node.type === "text" || node.type === "math")
      )
  );
  check(
    "P/F: answers stored separately",
    docs.odpowiedz.paragraphs[0]?.children.some(
      (node) => node.type === "text" && /^P/i.test(node.text)
    )
  );

  runIf(["task-pf", "true-false"], () => {
    assertStructureMatchesFixture("task-pf");
  });
});

// ── 6. Matching — matching-table node ───────────────────────────────────────
runSection("6. Matching — matching-table node", [
  "matching",
  "task-matching",
], () => {
  const { exercise, docs } = docsFromFixture("task-matching");
  const matchingParagraph = matchingTableParagraph(docs.tresc);
  const tableNode = matchingParagraph?.children.find(
    (node) => node.type === "matching-table"
  );

  check(
    "Matching: detected as dopasuj",
    visionExerciseSuggestedTyp(exercise) === "dopasuj"
  );
  check("Matching: matching-table node present", Boolean(matchingParagraph));
  check(
    "Matching: CKE layout cke-dopasuj",
    tableNode?.type === "matching-table" &&
      tableNode.layout === "cke-dopasuj"
  );
  check(
    "Matching: three item rows",
    tableNode?.type === "matching-table" && tableNode.rows.length === 3
  );
  check(
    "Matching: four answer options listed",
    tableNode?.type === "matching-table" && tableNode.options.length === 4
  );
  check(
    "Matching: left items are inline nodes not flat text",
    tableNode?.type === "matching-table" &&
      tableNode.rows.every((row) =>
        row.left.some((node) => node.type === "text" || node.type === "math")
      )
  );
  check(
    "Matching: answers stored separately",
    docs.odpowiedz.paragraphs[0]?.children.some(
      (node) => node.type === "text" && node.text.includes("1:A")
    )
  );

  runIf(["task-matching", "matching"], () => {
    assertStructureMatchesFixture("task-matching");
  });
});

// ── 7. Images — position and exercise attachment ────────────────────────────
if (
  scope.matches(
    "image",
    "graph",
    "geometry",
    "task-image-reading-order",
    "task-18-figure",
    "task-18-figure-live-2026",
    "18",
    "multiple-choice"
  )
) {
  section("7. Images — anchor and reading order");

runIf(["task-image-reading-order", "graph", "image"], () => {
  const { docs } = docsFromFixture("task-image-reading-order");
  const imgIdx = imageParagraphIndex(docs.tresc);
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Odczytaj wartość")
  );
  const questionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Zapisz obliczenia")
  );

  check("Image: creates image node", countImageNodes(docs.tresc) === 1);
  check(
    "Image: attached to correct exercise (not empty)",
    documentContainsText(docs.tresc, "wykres funkcji f") ||
      docs.tresc.paragraphs.some((p) =>
        p.children.some((n) => n.type === "image" && n.alt.includes("wykres"))
      )
  );

  // Known regression: after_instruction anchor lands after ALL body paragraphs.
  check(
    "Image: immediately after instruction paragraph (not after question)",
    imgIdx === instructionIdx + 1,
    `instruction=${instructionIdx} image=${imgIdx} question=${questionIdx}`
  );
  check(
    "Image: before Zapisz obliczenia closing line",
    imgIdx >= 0 && questionIdx > imgIdx,
    `image=${imgIdx} zapisz=${questionIdx}`
  );
});

if (scope.matches("image", "graph", "geometry", "task-image-reading-order", "task-18-figure", "task-18-figure-live-2026")) {
  const sharp = (await import("sharp")).default;
  const page = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 360,
            height: 18,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        },
        top: 12,
        left: 20,
      },
      {
        input: {
          create: {
            width: 220,
            height: 120,
            channels: 3,
            background: { r: 30, g: 30, b: 30 },
          },
        },
        top: 90,
        left: 90,
      },
    ])
    .png()
    .toBuffer();

  const looseCrop = await cropFigureFromPage(page, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const tightCrop = await cropFigureFromPage(
    page,
    { x: 0, y: 0, width: 100, height: 100 },
    { illustrationOnly: true }
  );

  check(
    "Figure crop: illustration-only mode produces image",
    Boolean(tightCrop?.src?.startsWith("data:image"))
  );
  check(
    "Figure crop: trims surrounding printed text from bbox",
    (tightCrop?.height ?? 0) < (looseCrop?.height ?? 0),
    `loose=${looseCrop?.height ?? 0} tight=${tightCrop?.height ?? 0}`
  );

  const attached = await attachFiguresToExercise(
    {
      identifier: "8",
      instruction: "Na rysunku przedstawiono wykres funkcji f.",
      subtasks: [],
      answers: [],
      figures: [
        {
          anchor: "after_instruction",
          bbox: { x: 0, y: 0, width: 100, height: 100 },
          alt: "wykres funkcji f",
        },
      ],
    },
    page
  );

  check(
    "Figure attach: uses illustration-only crop when Vision text exists",
    Boolean(attached.figures?.[0]?.src?.startsWith("data:image"))
  );
  check(
    "Figure attach: figure node has no duplicated text paragraphs",
    attached.figures?.length === 1 &&
      !attached.instruction.includes(attached.figures[0]?.src ?? "")
  );

  const attachedBodyBlocks = await attachFiguresToExercise(
    {
      identifier: "18",
      instruction: "",
      bodyBlocks: [
        "Dany jest trójkąt prostokątny ABC.",
        "Dokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.",
      ],
      subtasks: [],
      answers: [],
      figures: [
        {
          anchor: "after_instruction",
          bbox: { x: 0, y: 0, width: 100, height: 100 },
          alt: "trójkąt",
        },
      ],
    },
    page
  );

  check(
    "Figure attach: bodyBlocks-only exercise uses illustration-only crop",
    Boolean(attachedBodyBlocks.figures?.[0]?.src?.startsWith("data:image")) &&
      (attachedBodyBlocks.figures?.[0]?.height ?? 0) <=
        (looseCrop?.height ?? Number.MAX_SAFE_INTEGER)
  );
}

runIf(["task-image-reading-order", "graph", "image"], () => {
  assertStructureMatchesFixture("task-image-reading-order");
});

runIf(["task-12-graph", "graph"], () => {
  assertStructureMatchesFixture("task-12-graph");
});

runIf(["task-18-figure", "geometry", "image", "multiple-choice", "18"], () => {
  const { docs } = docsFromFixture("task-18-figure");
  const imgIdx = imageParagraphIndex(docs.tresc);
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Dokończ zdanie")
  );
  const questionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Sinus kąta")
  );

  check("Task 18 figure: creates image node", countImageNodes(docs.tresc) === 1);
  check(
    "Task 18 figure: after instruction (bodyBlocks path)",
    imgIdx === instructionIdx + 1,
    `instruction=${instructionIdx} image=${imgIdx} question=${questionIdx}`
  );
  check(
    "Task 18 figure: before closing question line",
    imgIdx >= 0 && questionIdx > imgIdx,
    `image=${imgIdx} question=${questionIdx}`
  );
  check(
    "Task 18 figure: inline ABCD on one line",
    docs.tresc.paragraphs.filter((p) => paragraphContainsText(p, "A.")).length === 1
  );
  check(
    "Task 18 figure: tresc omits Zadanie heading (card title in UI)",
    !docs.tresc.paragraphs.some((p) =>
      paragraphContainsText(p, "Zadanie 18.")
    )
  );
  check(
    "Task 18 figure: no duplicate triangle context paragraphs",
    docs.tresc.paragraphs.filter((p) =>
      paragraphContainsText(p, "trójkąt prostokątny")
    ).length === 1
  );
});

runIf(["task-18-figure-live-2026", "geometry", "18"], () => {
  const { docs } = docsFromFixture("task-18-figure-live-2026");
  const imgIdx = imageParagraphIndex(docs.tresc);
  const contextIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "trójkąt prostokątny")
  );
  const instructionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Dokończ zdanie")
  );
  const questionIdx = findParagraphIndex(docs.tresc, (p) =>
    paragraphContainsText(p, "Sinus kąta")
  );

  check(
    "Task 18 live: triangle context preserved",
    contextIdx === 0,
    `context=${contextIdx}`
  );
  check(
    "Task 18 live: figure after instruction",
    imgIdx === instructionIdx + 1,
    `instruction=${instructionIdx} image=${imgIdx} question=${questionIdx}`
  );
  check(
    "Task 18 live: question after figure",
    imgIdx >= 0 && questionIdx > imgIdx,
    `image=${imgIdx} question=${questionIdx}`
  );
  check(
    "Task 18 live: gamma renders as MathNode",
    docs.tresc.paragraphs.some((paragraph) =>
      paragraph.children.some(
        (node) => node.type === "math" && node.latex === "\\gamma"
      )
    )
  );
  assertStructureMatchesFixture("task-18-figure-live-2026");
});

runIf(["task-18-figure", "geometry", "18"], () => {
  const fixture = loadVisionFixture("task-18-figure");
  const legacyOverlap = {
    ...fixture,
    bodyBlocks: undefined,
    context:
      "Dany jest trójkąt prostokątny ABC, w którym bok AC jest przeciwprostokątną oraz |BC| = 2 i |AC| = 2√10. Oznaczmy kąt BCA przez γ (zobacz rysunek).",
    instruction:
      "Dany jest trójkąt prostokątny ABC, w którym bok AC jest przeciwprostokątną oraz |BC| = 2 i |AC| = 2√10. Oznaczmy kąt BCA przez γ (zobacz rysunek). Dokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.",
    question: "Sinus kąta γ jest równy",
  };
  const overlapDocs = visionExerciseToEditorDocuments(legacyOverlap, "overlap");
  check(
    "Task 18 legacy overlap: context not duplicated in instruction",
    overlapDocs.tresc.paragraphs.filter((p) =>
      paragraphContainsText(p, "trójkąt prostokątny")
    ).length === 1
  );
  check(
    "Task 18 legacy overlap: keeps Dokończ instruction line",
    overlapDocs.tresc.paragraphs.some((p) =>
      paragraphContainsText(p, "Dokończ zdanie")
    )
  );
});

runIf(["task-18-figure", "geometry", "18"], () => {
  assertStructureMatchesFixture("task-18-figure");
});
}

// ── 8. Tables — editable structure ────────────────────────────────────────
runSection("8. Tables — not flattened text", ["table", "task-table"], () => {
  const { docs } = docsFromFixture("task-table");
  const hasTableNode = docs.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some((node) => node.type === "table")
  );
  const hasTabFlattened = docs.tresc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.includes("\t")
    )
  );

  check(
    "Table: renders as editable table node",
    hasTableNode,
    "no table node type in EditorDocument yet"
  );
  check(
    "Table: not flattened to tab-separated text",
    !hasTabFlattened,
    "currently flattened via tableToParagraphs"
  );

  assertStructureMatchesFixture("task-table");
});

// ── 9. Exercise metadata — CKE identifiers ──────────────────────────────────
runSection("9. Exercise metadata — MAT2026-PP-xxx", ["core", "metadata"], () => {

check(
  "Build MAT2026-PP-001",
  buildCkeSourceIdentifier({ year: 2026, level: "pp", exerciseNumber: 18 }) ===
    "MAT2026-PP-018"
);
check(
  "Build MAT2026-PR-012",
  buildCkeSourceIdentifier({ year: 2026, level: "pr", exerciseNumber: 12 }) ===
    "MAT2026-PR-012"
);
check(
  "Reject Pazdro-style identifiers for CKE matura",
  !isCkeSourceIdentifier("1.171") && !isCkeSourceIdentifier("1.188")
);

const maturaSession = {
  klasaId: "",
  dzialId: "",
  tematId: "",
  typ: "",
  zrodlo: "matura",
  identyfikatorPrefix: null,
  sourceMetadata: {
    rokEgzaminu: 2026,
    sesjaEgzaminu: "maj",
    poziomEgzaminu: "pp",
  },
};

const ckeExercises = applyCkeSourceIdentifiers(
  [
    {
      index: 17,
      number: "18",
      rawText: "",
      confidence: 1,
      level: null,
      levelDetected: false,
      mathReconstructed: false,
      mathReconstructionMethod: null,
      tresc: { version: 1, paragraphs: [] },
      rozwiazanie: { version: 1, paragraphs: [] },
      odpowiedz: { version: 1, paragraphs: [] },
      selected: true,
      saved: false,
      savedTaskId: null,
      savedKod: null,
      poziom: null,
      punkty: null,
      czas: null,
      identifikatorPp: "1.18",
      identifikatorPr: "1.18",
    },
  ],
  maturaSession
);

check(
  "CKE import assigns MAT2026-PP-018",
  ckeExercises[0]?.identifikatorZrodla === "MAT2026-PP-018"
);
check(
  "CKE import clears Pazdro PP/PR fields",
  !ckeExercises[0]?.identifikatorPp && !ckeExercises[0]?.identifikatorPr
);
check(
  "CKE multipart merge keeps single identifier",
  mergeCkeVisionExercises([
    {
      identifier: "12.1",
      instruction: "Część pierwsza",
      subtasks: [{ label: "I", text: "Pytanie I" }],
      answers: [],
    },
    {
      identifier: "12.2",
      instruction: "",
      subtasks: [{ label: "II", text: "Pytanie II" }],
      answers: [],
    },
  ])[0]?.identifier === "12"
);
});

runIf(["task-18-mc", "18", "multiple-choice"], () => {
  const { docs } = docsFromFixture("task-18-mc");
  const firstParagraph = docs.tresc.paragraphs[0];
  const hasNumberingPrefix = firstParagraph?.children.some(
    (node) => node.type === "text" && node.text.includes("Zadanie 18.")
  );

  // Pipeline adds formatCkeNumberingPrefix; Preview UI also shows card title → duplicate heading.
  check(
    "Duplicate heading: tresc omits Zadanie N. prefix (UI shows card title)",
    !hasNumberingPrefix,
    "tresc currently prefixes Zadanie 18. — duplicates Preview card title"
  );
});

// ── 10. Fixture snapshot regression (full pipeline shape) ────────────────────
runSection("10. Fixture snapshot regression", [
  "task-18-inline-sentence",
  "task-display-math",
  "task-12-graph",
  "task-12-fill-numbers",
  "task-12-fill-intervals",
  "task-intervals-sets",
  "task-set-instruction",
  "task-zapisz-obliczenia",
  "task-table",
  "inline-math",
  "display-math",
  "fill-blank",
  "open",
  "table",
  "12",
], () => {
  for (const name of [
    "task-18-inline-sentence",
    "task-display-math",
    "task-12-graph",
    "task-12-fill-numbers",
    "task-12-fill-intervals",
    "task-intervals-sets",
    "task-set-instruction",
    "task-zapisz-obliczenia",
    "task-table",
  ]) {
    runIf([name], () => {
      assertStructureMatchesFixture(name);
    });
  }
});

// ── 11. Live Vision (optional — full regression only) ────────────────────────
if (!scope.active) {
  section("11. Live Vision from CKE PDF (optional)");

  if (!liveVisionEnabled()) {
    console.log(
      "  ℹ Live tests skipped. Set OPENAI_API_KEY + CKE_IMPORT_LIVE_VISION=1 to enable."
    );
  } else if (!existsSync(DEFAULT_CKE_PDF)) {
    console.log(`  ℹ PDF not found: ${DEFAULT_CKE_PDF}`);
  } else {
    const { extractExercisesFromPageImage } = await import(
      "../app/lib/import/visionExtract.ts"
    );
    const { pdf } = await import("pdf-to-img");

    const buffer = readFileSync(DEFAULT_CKE_PDF);
    const document = await pdf(buffer, { scale: 2.5 });
    const liveTargets = (process.env.CKE_IMPORT_LIVE_TARGETS ?? "18")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const allExercises = [];
    let pageIndex = 0;

    for await (const image of document) {
      pageIndex += 1;
      const pageResult = await extractExercisesFromPageImage(
        Buffer.from(image),
        pageIndex
      );
      allExercises.push(...pageResult.exercises);
    }

    check(
      "Live Vision: extracted exercises from PDF",
      allExercises.length > 0,
      `count=${allExercises.length}`
    );

    for (const target of liveTargets) {
      const exercise = allExercises.find(
        (item) => item.identifier?.trim() === target
      );

      check(`Live Vision: found task ${target}`, Boolean(exercise));

      if (!exercise) continue;

      const docs = visionExerciseToEditorDocuments(exercise, `live-${target}`);
      const fixtureName =
        target === "18"
          ? (exercise.figures?.length ?? 0) > 0
            ? "task-18-figure"
            : "task-18-mc"
          : target === "7"
            ? "task-18-inline-sentence"
            : null;

      if (fixtureName) {
        const expected = loadExpectedStructure(fixtureName);
        const actual = documentToStructure(docs.tresc);
        const cmp = compareStructure(actual, expected.tresc);

        check(
          `Live task ${target}: tresc matches fixture snapshot`,
          cmp.ok,
          cmp.ok ? "" : `${cmp.diff?.length ?? 0} paragraph diff(s)`,
          { expectedFail: false }
        );
      }

      check(
        `Live task ${target}: produces MathNodes when math present`,
        countMathNodes(docs.tresc) > 0 || !documentPlainText(docs.tresc).match(/\\frac|√|\^/),
        `mathCount=${countMathNodes(docs.tresc)}`
      );
    }
  }
} else if (liveVisionEnabled()) {
  console.log(
    "  ℹ Live Vision skipped in scoped mode. Run full suite for live regression."
  );
}

const result = summary();
if (scope.active && result.passed + result.failed + result.expectedFailures === 0) {
  console.error("\nScope filter matched no tests. Try a different filter.\n");
  process.exitCode = 1;
}
