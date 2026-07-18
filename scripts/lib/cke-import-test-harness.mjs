/**
 * Shared harness for CKE import pipeline regression tests.
 * Asserts on EditorDocument structure — not per-exercise UI hacks.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_ROOT = join(__dirname, "..", "fixtures", "cke-import");

export function loadEnvFile() {
  const envPath = join(__dirname, "..", "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

export function createSuite(label = "CKE import regression") {
  const stats = {
    label,
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    expectedFailuresStillFailing: 0,
    skipped: 0,
  };

  function check(name, ok, detail = "", options = {}) {
    const { expectedFail = false, skip = false } = options;

    if (skip) {
      stats.skipped += 1;
      console.log(`[SKIP] ${name}${detail ? ` — ${detail}` : ""}`);
      return;
    }

    if (expectedFail) {
      stats.expectedFailures += 1;
      const mark = ok ? "XFAIL" : "KNOWN";
      if (!ok) stats.expectedFailuresStillFailing += 1;
      else stats.passed += 1;
      console.log(
        `[${mark}] ${name}${detail ? ` — ${detail}` : ""} (expected to fail until fix lands)`
      );
      return;
    }

    const mark = ok ? "PASS" : "FAIL";
    if (ok) stats.passed += 1;
    else stats.failed += 1;
    console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  }

  function section(title) {
    console.log(`\n── ${title} ${"─".repeat(Math.max(0, 58 - title.length))}`);
  }

  function summary() {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`${stats.label}`);
    console.log(
      `  PASS: ${stats.passed}  FAIL: ${stats.failed}  SKIP: ${stats.skipped}`
    );
    if (stats.expectedFailures > 0) {
      console.log(
        `  KNOWN REGRESSIONS: ${stats.expectedFailuresStillFailing}/${stats.expectedFailures} still failing`
      );
    }
    const exitFail =
      stats.failed > 0 ||
      (process.env.CKE_IMPORT_STRICT_KNOWN === "1" &&
        stats.expectedFailuresStillFailing > 0);
    if (exitFail) {
      process.exitCode = 1;
    }
    return stats;
  }

  return { check, section, summary, stats };
}

export function loadJsonFixture(...parts) {
  const path = join(FIXTURES_ROOT, ...parts);
  if (!existsSync(path)) {
    throw new Error(`Fixture not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadVisionFixture(name) {
  return loadJsonFixture("vision", `${name}.json`);
}

export function loadExpectedStructure(name) {
  return loadJsonFixture("expected", `${name}.structure.json`);
}

/** Strip volatile ids for structural comparison. */
export function inlineNodeToShape(node) {
  switch (node.type) {
    case "text":
      return { type: "text", text: node.text ?? "" };
    case "math":
      return { type: "math", latex: node.latex ?? "" };
    case "image":
      return {
        type: "image",
        alt: node.alt ?? "",
        hasSrc: Boolean(node.src),
        width: node.width ?? null,
        height: node.height ?? null,
      };
    case "table":
      return {
        type: "table",
        headers: node.headers ?? null,
        rows: (node.rows ?? []).map((row) => [...row]),
      };
    case "true-false-table":
      return {
        type: "true-false-table",
        layout: node.layout ?? null,
        rows: (node.rows ?? []).map((row) => ({
          label: row.label ?? null,
          statement: (row.statement ?? []).map(inlineNodeToShape),
        })),
      };
    case "matching-table":
      return {
        type: "matching-table",
        layout: node.layout ?? null,
        options: (node.options ?? []).map((option) => ({
          label: option.label ?? null,
          text: option.text ?? "",
        })),
        rows: (node.rows ?? []).map((row) => ({
          label: row.label ?? null,
          left: (row.left ?? []).map(inlineNodeToShape),
        })),
      };
    default:
      return { type: node.type ?? "unknown" };
  }
}

export function documentToStructure(document) {
  if (!document?.paragraphs) {
    return [];
  }

  return document.paragraphs.map((paragraph) => ({
    nodes: (paragraph.children ?? []).map(inlineNodeToShape),
  }));
}

export function documentPlainText(document) {
  if (!document?.paragraphs) return "";

  return document.paragraphs
    .map((paragraph) =>
      paragraph.children
        .map((node) => {
          if (node.type === "text") return node.text ?? "";
          if (node.type === "math") return `$${node.latex ?? ""}$`;
          if (node.type === "image") return `[image:${node.alt ?? ""}]`;
          if (node.type === "true-false-table") {
            return `[pf-table:${node.rows?.length ?? 0}]`;
          }
          if (node.type === "matching-table") {
            return `[matching-table:${node.rows?.length ?? 0}]`;
          }
          return `[${node.type}]`;
        })
        .join("")
    )
    .join("\n");
}

export function paragraphSignatures(document) {
  return documentToStructure(document).map((paragraph) =>
    paragraph.nodes.map((node) => node.type).join("+")
  );
}

export function findParagraphIndex(document, predicate) {
  return document.paragraphs.findIndex((paragraph) => predicate(paragraph));
}

export function paragraphContainsText(paragraph, text) {
  return paragraph.children.some(
    (node) => node.type === "text" && node.text.includes(text)
  );
}

export function documentContainsText(document, text) {
  return documentPlainText(document).includes(text);
}

export function collectMathLatex(document) {
  const latex = [];
  for (const paragraph of document.paragraphs ?? []) {
    for (const node of paragraph.children ?? []) {
      if (node.type === "math") latex.push(node.latex);
    }
  }
  return latex;
}

export function compareStructure(actual, expected, options = {}) {
  const { ignoreParagraphCount = false } = options;
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson === expectedJson) {
    return { ok: true, diff: null };
  }

  if (ignoreParagraphCount && actual.length === expected.length) {
    return { ok: false, diff: "structure mismatch" };
  }

  const diffs = [];
  const maxLen = Math.max(actual.length, expected.length);

  for (let i = 0; i < maxLen; i += 1) {
    const a = actual[i];
    const e = expected[i];
    const aJson = JSON.stringify(a ?? null);
    const eJson = JSON.stringify(e ?? null);
    if (aJson !== eJson) {
      diffs.push({ index: i, actual: a ?? null, expected: e ?? null });
    }
  }

  return { ok: false, diff: diffs };
}

export function hasMultipleChoiceStructure(document) {
  const mcParagraph = document.paragraphs.find((paragraph) =>
    paragraph.children.some(
      (node) => node.type === "text" && /\bA\.\s/.test(node.text)
    )
  );

  if (!mcParagraph) return false;

  const labels = ["A", "B", "C", "D"];
  const text = mcParagraph.children
    .filter((node) => node.type === "text")
    .map((node) => node.text)
    .join("");

  return labels.every((label) => text.includes(`${label}.`));
}

export function imageParagraphIndex(document) {
  return findParagraphIndex(document, (paragraph) =>
    paragraph.children.some((node) => node.type === "image")
  );
}

export function trueFalseTableParagraph(document) {
  return document.paragraphs.find((paragraph) =>
    paragraph.children.some((node) => node.type === "true-false-table")
  );
}

export function matchingTableParagraph(document) {
  return document.paragraphs.find((paragraph) =>
    paragraph.children.some((node) => node.type === "matching-table")
  );
}

export const DEFAULT_CKE_PDF =
  process.env.CKE_IMPORT_PDF ??
  "C:\\Users\\edyta\\Dropbox\\Mój komputer (LAPTOP-CIN5IPK8)\\Downloads\\matematyka-2026-maj-matura-podstawowa.pdf";

export function liveVisionEnabled() {
  loadEnvFile();
  return Boolean(process.env.OPENAI_API_KEY && process.env.CKE_IMPORT_LIVE_VISION === "1");
}
