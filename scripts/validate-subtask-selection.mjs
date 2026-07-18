/**
 * Unit tests for subtask detection and document filtering.
 */
import { visionExerciseToEditorDocuments } from "../app/lib/import/visionToEditorDocument.ts";
import {
  detectSubtasks,
  filterInlineAnswerBySubtasks,
  filterTaskDocumentBySubtasks,
  isFullSubtaskSelection,
  normalizeSubtaskSelectionForStorage,
} from "../app/lib/subtaskSelection.ts";

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
    { label: "a", expression: "(-1 3/4) · (-2,5) · 3 5/6 · (-6) · 4/7 · 2" },
    { label: "b", expression: "0,375 · 4 · √6 · (-1/√6) · (-0,25) · (-8)" },
    { label: "c", expression: "1/21 · 25/7 · 0,7 · 1/3,5 · (-7) · (-42/5)" },
    { label: "d", expression: "3,6 · (-1/2) · (-5/6) · 4 · 0,25" },
  ],
  answers: [
    { label: "a", value: "-115" },
    { label: "b", value: "-3" },
    { label: "c", value: "2" },
    { label: "d", value: "1,5" },
  ],
};

const documents = visionExerciseToEditorDocuments(exercise141, "subtask-test");
const subtasks = detectSubtasks(documents.tresc);

check("Detects four subtasks", subtasks.length === 4, subtasks.join(", "));
check(
  "Subtask order preserved",
  subtasks.join("") === "abcd",
  subtasks.join("")
);

const filteredTask = filterTaskDocumentBySubtasks(documents.tresc, ["a", "c"]);
const filteredTaskDoc =
  filteredTask && typeof filteredTask === "object"
    ? filteredTask
    : { paragraphs: [] };

check(
  "Filtered task keeps instruction + selected subtasks",
  filteredTaskDoc.paragraphs.length === 3,
  `count=${filteredTaskDoc.paragraphs.length}`
);
check(
  "Renumbered task keeps first selected as a",
  filteredTaskDoc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.startsWith("a) ")
    )
  )
);
check(
  "Renumbered partial selection uses sequential a, b labels",
  (() => {
    const labels = filteredTaskDoc.paragraphs
      .map((paragraph) =>
        paragraph.children.find(
          (node) =>
            node.type === "text" && /^[a-d]\)\s/.test(node.text)
        )
      )
      .filter(Boolean)
      .map((node) => node.text.trim().charAt(0));

    return labels.join("") === "ab";
  })()
);
check(
  "Renumbered task maps original c to b",
  filteredTaskDoc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.startsWith("b) ")
    )
  )
);
check(
  "Renumbered task drops original c label",
  !filteredTaskDoc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.startsWith("c) ")
    )
  )
);

const filteredTaskOriginalLabels = filterTaskDocumentBySubtasks(
  documents.tresc,
  ["a", "c"],
  false
);
const filteredTaskOriginalDoc =
  filteredTaskOriginalLabels &&
  typeof filteredTaskOriginalLabels === "object"
    ? filteredTaskOriginalLabels
    : { paragraphs: [] };

check(
  "Without renumbering, original c label remains",
  filteredTaskOriginalDoc.paragraphs.some((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && node.text.startsWith("c) ")
    )
  )
);

const filteredAnswer = filterInlineAnswerBySubtasks(
  documents.odpowiedz,
  ["b", "d"],
  false
);
const filteredAnswerDoc =
  filteredAnswer && typeof filteredAnswer === "object"
    ? filteredAnswer
    : { paragraphs: [] };
const answerChildren = filteredAnswerDoc.paragraphs[0]?.children ?? [];

check(
  "Filtered answer keeps b and d labels",
  answerChildren.some((node) => node.type === "text" && node.text === "b) ") &&
    answerChildren.some((node) => node.type === "text" && node.text === "d) ")
);
check(
  "Filtered answer drops a label",
  !answerChildren.some((node) => node.type === "text" && node.text === "a) ")
);

const renumberedAnswer = filterInlineAnswerBySubtasks(
  documents.odpowiedz,
  ["b", "d"],
  true
);
const renumberedAnswerDoc =
  renumberedAnswer && typeof renumberedAnswer === "object"
    ? renumberedAnswer
    : { paragraphs: [] };
const renumberedAnswerChildren =
  renumberedAnswerDoc.paragraphs[0]?.children ?? [];

check(
  "Renumbered answer maps original b to a",
  renumberedAnswerChildren.some(
    (node) => node.type === "text" && node.text === "a) "
  )
);
check(
  "Renumbered answer maps original d to b",
  renumberedAnswerChildren.some(
    (node) => node.type === "text" && node.text === "b) "
  )
);
check(
  "Renumbered answer drops original d label",
  !renumberedAnswerChildren.some(
    (node) => node.type === "text" && node.text === "d) "
  )
);

check(
  "Full selection stores as undefined",
  normalizeSubtaskSelectionForStorage(["a", "b"], ["a", "b"]) === undefined
);
check(
  "Partial selection stored",
  JSON.stringify(normalizeSubtaskSelectionForStorage(["a", "b", "c"], ["a"])) ===
    JSON.stringify(["a"])
);
check(
  "Full selection detection",
  isFullSubtaskSelection(["a", "b", "c"], ["a", "b", "c"])
);

const singleAnswerExercise = {
  identifier: "1.148",
  instruction: "Example word problem",
  subtasks: [],
  answers: [{ label: "", value: "2840 zł" }],
};

const singleDocuments = visionExerciseToEditorDocuments(
  singleAnswerExercise,
  "single"
);

check(
  "Single-answer task has no subtasks",
  detectSubtasks(singleDocuments.tresc).length === 0
);
check(
  "Single-answer filter is no-op",
  filterTaskDocumentBySubtasks(singleDocuments.tresc, ["a"]) ===
    singleDocuments.tresc
);
