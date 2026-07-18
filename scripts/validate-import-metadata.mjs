import assert from "node:assert/strict";

import {
  detectMultipleChoiceInText,
  formatMultipleChoiceLabel,
} from "../app/lib/import/multipleChoiceDetect.ts";
import { detectSourceMetadataFromImport } from "../app/lib/sourceMetadataDetect.ts";
import {
  getSourceMetadataFields,
  sourceMetadataHasFields,
} from "../app/lib/sourceMetadata.ts";
import {
  countImageNodes,
  visionExerciseToEditorDocuments,
} from "../app/lib/import/visionToEditorDocument.ts";
import {
  formatCkeNumberingPrefix,
  mergeCkeVisionExercises,
  normalizeCkeIdentifier,
} from "../app/lib/import/maturaParser.ts";
import { cropFigureFromPage } from "../app/lib/import/pdfImageCrop.ts";
import sharp from "sharp";

let failed = 0;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed += 1;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

check(
  "Pazdro has no extra source fields",
  getSourceMetadataFields("pazdro").length === 0
);
check(
  "Matura has year/session/level fields",
  getSourceMetadataFields("matura").map((field) => field.key).join(",") ===
    "rokEgzaminu,sesjaEgzaminu,poziomEgzaminu"
);
check(
  "Egzamin ósmoklasisty has year/session fields",
  getSourceMetadataFields("egzamin-osmoklasisty").length === 2
);
check(
  "Unknown source hides fields",
  !sourceMetadataHasFields("nowa-era")
);

const detected = detectSourceMetadataFromImport(
  "matura_maj_2026_PP.pdf",
  "Arkusz maturalny z matematyki poziom podstawowy maj 2026"
);
check("Detect matura source", detected.zrodlo === "matura");
check("Detect year", detected.sourceMetadata?.rokEgzaminu === 2026);
check("Detect session", detected.sourceMetadata?.sesjaEgzaminu === "maj");
check("Detect PP level", detected.sourceMetadata?.poziomEgzaminu === "pp");

const mcText = [
  "Wartość wyrażenia 2 · 3² − 4 jest równa",
  "A. 14",
  "B. 18",
  "C. 22",
  "D. 26",
].join("\n");
const mc = detectMultipleChoiceInText(mcText);
check("Detect multiple choice options", mc?.options.length === 4);
check(
  "Multiple choice labels",
  mc?.options.map((option) => option.label).join("") === "ABCD"
);
check(
  "Multiple choice label format",
  formatMultipleChoiceLabel("b") === "B."
);

const visionDocs = visionExerciseToEditorDocuments(
  {
    identifier: "12",
    exerciseKind: "multiple_choice",
    instruction: "Wartość wyrażenia 2 · 3² − 4 jest równa",
    subtasks: [],
    choices: [
      { label: "A", text: "14" },
      { label: "B", text: "18" },
      { label: "C", text: "22" },
      { label: "D", text: "26" },
    ],
    answers: [{ label: "", value: "A" }],
    correctChoice: "A",
  },
  "test"
);

const taskText = visionDocs.tresc.paragraphs
  .map((paragraph) =>
    paragraph.children
      .map((node) => (node.type === "text" ? node.text : node.latex))
      .join("")
  )
  .join("\n");

check("Vision MC keeps options in tresc", /A\.\s*14/.test(taskText));
check("Vision MC keeps all four options", /D\.\s*26/.test(taskText));
check(
  "Vision MC stores answer separately",
  visionDocs.odpowiedz.paragraphs[0]?.children[0]?.type === "text" &&
    visionDocs.odpowiedz.paragraphs[0]?.children[0]?.text === "A"
);

const ckeContextDocs = visionExerciseToEditorDocuments(
  {
    identifier: "5",
    exerciseKind: "multiple_choice",
    context:
      "Anna wpłaciła na lokatę kwotę 2000 zł. Oprocentowanie lokaty wynosi 4% w skali roku, a odsetki kapitalizowane są co roku.",
    instruction: "Dokończ zadanie. Wybierz właściwą odpowiedź spośród podanych.",
    question:
      "Po dwóch latach oszczędzania na lokacie Anna będzie miała (zgodnie z zaokrągleniem do 1 grosza)",
    subtasks: [],
    choices: [
      { label: "A", text: "2081,60 zł" },
      { label: "B", text: "2160,00 zł" },
      { label: "C", text: "2163,20 zł" },
      { label: "D", text: "2240,00 zł" },
    ],
    answers: [{ label: "", value: "C" }],
    correctChoice: "C",
  },
  "cke-context"
);

const ckeContextText = ckeContextDocs.tresc.paragraphs
  .map((paragraph) =>
    paragraph.children
      .map((node) => (node.type === "text" ? node.text : node.latex))
      .join("")
  )
  .join("\n");

check(
  "CKE keeps introductory context in tresc",
  /Anna wpłaciła na lokatę/.test(ckeContextText)
);
check(
  "CKE keeps instruction in tresc",
  /Dokończ zadanie/.test(ckeContextText)
);
check(
  "CKE keeps final question in tresc",
  /Po dwóch latach oszczędzania/.test(ckeContextText)
);
check(
  "CKE intro and question are separate paragraphs",
  ckeContextDocs.tresc.paragraphs.length >= 4
);
check(
  "CKE answer stays out of tresc",
  ckeContextDocs.odpowiedz.paragraphs[0]?.children[0]?.type === "text" &&
    ckeContextDocs.odpowiedz.paragraphs[0]?.children[0]?.text === "C"
);

const ckeLegacyMultilineDocs = visionExerciseToEditorDocuments(
  {
    identifier: "6",
    exerciseKind: "multiple_choice",
    instruction: [
      "Jan wpłacił 1000 zł na konto oszczędnościowe.",
      "Dokończ zadanie. Wybierz właściwą odpowiedź spośród podanych.",
      "Ile Jan będzie miał po roku?",
    ].join("\n\n"),
    subtasks: [],
    choices: [
      { label: "A", text: "1020 zł" },
      { label: "B", text: "1040 zł" },
    ],
    answers: [{ label: "", value: "B" }],
  },
  "cke-legacy"
);
check(
  "Legacy multiline instruction splits into paragraphs",
  ckeLegacyMultilineDocs.tresc.paragraphs.length >= 4
);
check(
  "Multiple choice options stay on one line",
  /A\.\s*1020 zł\s{2,}B\.\s*1040 zł/.test(
    ckeLegacyMultilineDocs.tresc.paragraphs
      .map((paragraph) =>
        paragraph.children
          .map((node) => (node.type === "text" ? node.text : node.latex))
          .join("")
      )
      .join("\n")
  )
);

check(
  "Split-line MC labels are detected",
  detectMultipleChoiceInText(
    [
      "Liczba √5 jest równa",
      "A.",
      "5",
      "B.",
      "25",
      "C.",
      "125",
      "D.",
      "625",
    ].join("\n")
  )?.options.length === 4
);

check(
  "Repair split Polish command words",
  repairSplitPolishWords("Wy z nacz wartość") === "Wyznacz wartość" &&
    repairSplitPolishWords("Li czba √5") === "Liczba √5"
);

check(
  "Normalize CKE identifier",
  normalizeCkeIdentifier("Zadanie 12.") === "12"
);
check(
  "CKE numbering prefix",
  formatCkeNumberingPrefix("12") === "Zadanie 12."
);

const multipartMerged = mergeCkeVisionExercises([
  {
    identifier: "13.1",
    instruction: "W układzie współrzędnych dane są punkty A i B.",
    subtasks: [{ label: "I", text: "Oblicz długość odcinka AB." }],
    answers: [],
  },
  {
    identifier: "13.2",
    instruction: "",
    subtasks: [{ label: "II", text: "Wyznacz równanie prostej AB." }],
    answers: [],
  },
]);
check(
  "Merge multipart CKE exercises",
  multipartMerged.length === 1 && multipartMerged[0].identifier === "13"
);
check(
  "Multipart keeps subparts",
  (multipartMerged[0]?.subtasks?.length ?? 0) >= 2
);

const numberedDocs = visionExerciseToEditorDocuments(
  {
    identifier: "8",
    instruction: "Oblicz wartość wyrażenia.",
    subtasks: [{ label: "a", expression: "2 + 2" }],
    answers: [{ label: "a", value: "4" }],
  },
  "num"
);
const numberedText = numberedDocs.tresc.paragraphs
  .map((paragraph) =>
    paragraph.children
      .map((node) => (node.type === "text" ? node.text : node.latex))
      .join("")
  )
  .join("\n");
check(
  "CKE numbering preserved in tresc",
  numberedText.startsWith("Zadanie 8.")
);
check(
  "Answers stay out of tresc",
  !numberedText.includes("Odp") && numberedDocs.odpowiedz.paragraphs.length > 0
);

const figureDocs = visionExerciseToEditorDocuments(
  {
    identifier: "5",
    instruction: "Na rysunku przedstawiono trójkąt.",
    subtasks: [],
    answers: [],
    figures: [
      {
        anchor: "after_instruction",
        bbox: { x: 0, y: 0, width: 10, height: 10 },
        alt: "trójkąt",
        src: "data:image/png;base64,AAAA",
        width: 120,
        height: 80,
      },
    ],
  },
  "fig"
);
check(
  "Vision figure creates image node",
  countImageNodes(figureDocs.tresc) === 1
);

const png = await sharp({
  create: {
    width: 100,
    height: 60,
    channels: 3,
    background: { r: 200, g: 100, b: 50 },
  },
})
  .png()
  .toBuffer();
const cropped = await cropFigureFromPage(png, {
  x: 10,
  y: 10,
  width: 50,
  height: 40,
});
check("Crop figure from page", Boolean(cropped?.src?.startsWith("data:image")));
check("Cropped figure has dimensions", (cropped?.width ?? 0) > 0);

import { readFileSync } from "node:fs";
import { parseCkeMaturaExercisesFromFile } from "../app/lib/import/ckeTextParser.ts";
import { repairSplitPolishWords } from "../app/lib/import/ckeTextNormalize.ts";

const maturaSample = [
  "Zadanie 2. (0–1)",
  "Klient wpłacił do banku 10 000 zł na lokatę dwuletnią.",
  "Dokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.",
  "Po dwóch latach oszczędzania łączna wartość doliczonych odsetek jest równa",
  "A. 1200 zł B. 1236 zł C. 1836 zł D. 3600 zł",
  "Zadanie 3. (0–1)",
  "Liczba √5 jest równa",
  "A. 5 B. 25 C. 125 D. 625",
].join("\n");

const ckeBlocks = parseCkeMaturaExercisesFromFile(
  maturaSample,
  "matura-2026-maj.pdf"
);
const ckeTask2 = ckeBlocks.find((block) => block.number === "2");
const ckeTask2Text = ckeTask2?.tresc.paragraphs
  .map((paragraph) =>
    paragraph.children
      .map((node) => (node.type === "text" ? node.text : node.latex ?? ""))
      .join("")
  )
  .join("\n");

check("CKE text parser finds tasks", ckeBlocks.length >= 2);
check(
  "CKE task 2 keeps bank intro",
  ckeTask2Text?.includes("Klient wpłacił") ?? false
);
check("CKE task 2 keeps A option", ckeTask2Text?.includes("A.") ?? false);
check("CKE task 2 keeps D option", ckeTask2Text?.includes("D.") ?? false);
check(
  "CKE merges multipart 12.x",
  parseCkeMaturaExercisesFromFile(
    [
      "Zadanie 12.",
      "Funkcja f jest określona następująco:",
      "Zadanie 12.1. (0–2)",
      "Uzupełnij zdania. Pierwsze …",
      "Zadanie 12.2. (0–2)",
      "Uzupełnij zdania. Zbiorem …",
    ].join("\n"),
    "matura.pdf"
  ).length === 1
);

import {
  applyCkeSourceIdentifiers,
  buildCkeSourceIdentifier,
  formatCkeExerciseDisplayNumber,
  isCkeSourceIdentifier,
  parseCkeSourceIdentifier,
} from "../app/lib/import/ckeIdentifier.ts";
import {
  formatExerciseCardTitle,
  formatExerciseMetadataLine,
  resolveExerciseIdentyfikator,
} from "../app/lib/import/saveExercise.ts";

check(
  "Build CKE source identifier",
  buildCkeSourceIdentifier({ year: 2026, level: "pp", exerciseNumber: 1 }) ===
    "MAT2026-PP-001"
);
check(
  "Build CKE PR identifier",
  buildCkeSourceIdentifier({ year: 2026, level: "pr", exerciseNumber: 12 }) ===
    "MAT2026-PR-012"
);
check(
  "Parse CKE source identifier",
  parseCkeSourceIdentifier("MAT2026-PP-001")?.exerciseNumber === 1
);
check(
  "Detect CKE source identifier",
  isCkeSourceIdentifier("MAT2026-PP-001")
);
check(
  "CKE display number stays Zadanie N",
  formatCkeExerciseDisplayNumber("2") === "Zadanie 2"
);

const ckeExercises = applyCkeSourceIdentifiers(
  [
    {
      index: 0,
      number: "1",
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
    },
  ],
  {
    klasaId: "",
    dzialId: "",
    tematId: "",
    typ: "",
    zrodlo: "matura",
    identifikatorPrefix: null,
    sourceMetadata: {
      rokEgzaminu: 2026,
      sesjaEgzaminu: "maj",
      poziomEgzaminu: "pp",
    },
  }
);

check(
  "Apply CKE identifiers to matura import",
  ckeExercises[0]?.identifikatorZrodla === "MAT2026-PP-001"
);
check(
  "CKE import clears Pazdro PP/PR fields",
  !ckeExercises[0]?.identifikatorPp && !ckeExercises[0]?.identifikatorPr
);
check(
  "CKE card title is Zadanie N",
  formatExerciseCardTitle(ckeExercises[0], "matura") === "Zadanie 1"
);
check(
  "CKE metadata line shows internal id",
  formatExerciseMetadataLine(ckeExercises[0], "Matura", "matura") ===
    "Matura · MAT2026-PP-001"
);
check(
  "Resolve CKE identyfikator for save",
  resolveExerciseIdentyfikator(
    {
      klasaId: "",
      dzialId: "",
      tematId: "",
      typ: "",
      zrodlo: "matura",
      identifikatorPrefix: null,
      sourceMetadata: {
        rokEgzaminu: 2026,
        sesjaEgzaminu: "maj",
        poziomEgzaminu: "pp",
      },
    },
    ckeExercises[0]
  ) === "MAT2026-PP-001"
);
check(
  "Matura metadata line avoids Pazdro PP/PR fallback",
  !formatExerciseMetadataLine(
    { number: "1", identifikatorPp: null, identifikatorPr: null },
    "Matura",
    "matura"
  )?.includes("PP:")
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll import metadata checks passed.");
