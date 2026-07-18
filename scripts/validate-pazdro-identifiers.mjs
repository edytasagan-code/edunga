import {
  normalizePazdroExerciseIdentifiers,
  normalizePazdroVisionExercises,
  normalizeParsedExercisesPazdroIdentifiers,
} from "../app/lib/import/pazdroIdentifier.ts";
import {
  parsePazdroIdentifierField,
  resolvePazdroIdentifiers,
} from "../app/lib/import/visionNormalize.ts";

let failed = false;

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function visionExercise(overrides) {
  return {
    identifier: "",
    instruction: "",
    subtasks: [],
    level: null,
    sourceIdentifierBasic: null,
    sourceIdentifierExtended: null,
    ...overrides,
  };
}

check(
  "dual inline numbers map to PP and PR",
  parsePazdroIdentifierField("1.171   1.188").identifikatorPp === "1.171" &&
    parsePazdroIdentifierField("1.171   1.188").identifikatorPr === "1.188"
);

check(
  "single full identifier duplicates to PP and PR",
  parsePazdroIdentifierField("1.20").identifikatorPp === "1.20" &&
    parsePazdroIdentifierField("1.20").identifikatorPr === "1.20"
);

check(
  "single bare identifier duplicates to PP and PR",
  parsePazdroIdentifierField("20").identifikatorPp === "20" &&
    parsePazdroIdentifierField("20").identifikatorPr === "20"
);

check(
  "mixed dual identifiers preserve vision values",
  parsePazdroIdentifierField("1.171 20").identifikatorPp === "1.171" &&
    parsePazdroIdentifierField("1.171 20").identifikatorPr === "20"
);

check(
  "no prefix reconstruction for bare suffix",
  parsePazdroIdentifierField("20").identifikatorPr === "20" &&
    parsePazdroIdentifierField("20").identifikatorPp === "20"
);

const batch = normalizePazdroVisionExercises([
  visionExercise({ identifier: "1.19" }),
  visionExercise({
    identifier: "20",
    sourceIdentifierExtended: "20",
  }),
  visionExercise({ identifier: "1.21" }),
]);

check(
  "batch keeps bare identifier unchanged",
  batch[1].sourceIdentifierBasic === "20" &&
    batch[1].sourceIdentifierExtended === "20"
);

const parsed = normalizeParsedExercisesPazdroIdentifiers([
  {
    index: 0,
    number: "1.19",
    identifikatorPp: null,
    identifikatorPr: "1.19",
  },
  {
    index: 1,
    number: "20",
    identifikatorPp: null,
    identifikatorPr: "20",
  },
  {
    index: 2,
    number: "1.21",
    identifikatorPp: null,
    identifikatorPr: "1.21",
  },
]);

check(
  "parsed exercises duplicate single PR into PP",
  parsed[1].identifikatorPp === "20" &&
    parsed[1].identifikatorPr === "20"
);

const dual = normalizePazdroExerciseIdentifiers(
  visionExercise({
    identifier: "1.171 20",
    sourceIdentifierBasic: "1.171",
    sourceIdentifierExtended: "20",
  })
);

check(
  "explicit PP and PR stay as extracted",
  dual.sourceIdentifierBasic === "1.171" &&
    dual.sourceIdentifierExtended === "20"
);

check(
  "resolve from explicit PP only duplicates to PR",
  resolvePazdroIdentifiers("ignored", "1.188", null).identifikatorPp ===
    "1.188" &&
    resolvePazdroIdentifiers("ignored", "1.188", null).identifikatorPr ===
      "1.188"
);

if (failed) {
  process.exitCode = 1;
  console.log("\nSome Pazdro identifier checks failed.");
} else {
  console.log("\nAll Pazdro identifier checks passed.");
}
