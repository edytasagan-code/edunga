/**
 * Scoped test filtering for CKE import regression suite.
 *
 * Usage:
 *   npm run test:cke-import -- 18
 *   npm run test:cke-import -- true-false
 *   npm run test:cke-import -- task-18-mc
 *   CKE_IMPORT_SCOPE=geometry npm run test:cke-import
 */
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VISION_DIR = join(__dirname, "..", "fixtures", "cke-import", "vision");

/** @type {Record<string, { label: string, fixtures: string[], aliases?: string[] }>} */
export const CATEGORY_CATALOG = {
  "multiple-choice": {
    label: "Multiple choice (A/B/C/D)",
    fixtures: ["task-18-mc", "task-context-mc", "task-18-figure"],
    aliases: ["mc", "wybor", "wybor-wielokrotny"],
  },
  "true-false": {
    label: "True / False (P/F table)",
    fixtures: ["task-pf"],
    aliases: ["pf", "prawda-falsz", "prawdafalsz"],
  },
  matching: {
    label: "Matching (dopasuj)",
    fixtures: ["task-matching"],
    aliases: ["dopasuj", "match"],
  },
  geometry: {
    label: "Geometry figure (triangle)",
    fixtures: ["task-18-figure", "task-18-figure-live-2026"],
    aliases: ["figure", "triangle"],
  },
  graph: {
    label: "Function graph (wykres)",
    fixtures: ["task-image-reading-order", "task-12-graph"],
    aliases: ["function-graph", "wykres", "wykres-funkcji"],
  },
  table: {
    label: "Editable table",
    fixtures: ["task-table"],
    aliases: ["tables"],
  },
  "inline-math": {
    label: "Inline math in sentences",
    fixtures: [
      "task-18-inline-sentence",
      "task-18-mc",
      "task-intervals-sets",
      "task-set-instruction",
    ],
    aliases: ["inline", "inline-mathematics"],
  },
  "display-math": {
    label: "Display / standalone equations",
    fixtures: ["task-display-math", "task-12-graph"],
    aliases: ["display", "equations"],
  },
  image: {
    label: "Image-based task (anchor + crop)",
    fixtures: ["task-image-reading-order", "task-18-figure"],
    aliases: ["images", "figure-attach"],
  },
  open: {
    label: "Open question (Zapisz obliczenia)",
    fixtures: ["task-zapisz-obliczenia"],
    aliases: ["open-question", "zapisz-obliczenia"],
  },
  "fill-blank": {
    label: "Fill-in-the-blank (Uzupełnij)",
    fixtures: ["task-12-fill-numbers", "task-12-fill-intervals"],
    aliases: ["fill-blank", "fill-in", "uzupelnij", "task-12-fill"],
  },
  "reading-order": {
    label: "Reading order (context → instruction → body)",
    fixtures: [
      "task-context-mc",
      "task-18-inline-sentence",
      "task-zapisz-obliczenia",
      "task-image-reading-order",
    ],
    aliases: ["reading"],
  },
};

const TASK_12_FIXTURES = [
  "task-12-graph",
  "task-12-fill-numbers",
  "task-12-fill-intervals",
];

const TASK_18_FIXTURES = [
  "task-18-mc",
  "task-18-inline-sentence",
  "task-18-figure",
  "task-18-figure-live-2026",
];

/** Reverse map: alias → category key */
const ALIAS_TO_CATEGORY = new Map();
for (const [category, meta] of Object.entries(CATEGORY_CATALOG)) {
  ALIAS_TO_CATEGORY.set(category, category);
  for (const alias of meta.aliases ?? []) {
    ALIAS_TO_CATEGORY.set(alias.toLowerCase(), category);
  }
}

/** Reverse map: fixture → categories */
const FIXTURE_TO_CATEGORIES = new Map();
for (const [category, meta] of Object.entries(CATEGORY_CATALOG)) {
  for (const fixture of meta.fixtures) {
    const existing = FIXTURE_TO_CATEGORIES.get(fixture) ?? new Set();
    existing.add(category);
    FIXTURE_TO_CATEGORIES.set(fixture, existing);
  }
}

export function listVisionFixtureNamesFromDisk() {
  return readdirSync(VISION_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

function normalizeToken(token) {
  return token.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * Resolve CLI / env tokens to fixture names and category keys.
 * @param {string[]} tokens
 */
export function resolveScopeTokens(tokens) {
  const fixtures = new Set();
  const categories = new Set();
  const unknown = [];

  for (const raw of tokens) {
    const token = normalizeToken(raw);
    if (!token || token === "--") continue;

    if (token === "18" || token === "task-18") {
      for (const name of TASK_18_FIXTURES) fixtures.add(name);
      categories.add("18");
      continue;
    }

    if (token === "12" || token === "task-12") {
      for (const name of TASK_12_FIXTURES) fixtures.add(name);
      categories.add("12");
      continue;
    }

    if (token === "core" || token === "routing" || token === "metadata") {
      categories.add("core");
      continue;
    }

    if (CATEGORY_CATALOG[token]) {
      categories.add(token);
      for (const name of CATEGORY_CATALOG[token].fixtures) fixtures.add(name);
      continue;
    }

    const category = ALIAS_TO_CATEGORY.get(token);
    if (category) {
      categories.add(category);
      for (const name of CATEGORY_CATALOG[category].fixtures) fixtures.add(name);
      continue;
    }

    const fixtureName = token.startsWith("task-") ? token : `task-${token}`;
    if (listVisionFixtureNamesFromDisk().includes(fixtureName)) {
      fixtures.add(fixtureName);
      continue;
    }

    unknown.push(raw);
  }

  return { fixtures, categories, unknown };
}

/**
 * @param {string[]} argvTokens process.argv slice after script name
 */
export function parseCkeImportScope(argvTokens = []) {
  const cliTokens = [];

  for (let i = 0; i < argvTokens.length; i += 1) {
    const arg = argvTokens[i];
    if (arg === "--filter" || arg === "-f") {
      const next = argvTokens[i + 1];
      if (next && !next.startsWith("-")) {
        cliTokens.push(...next.split(/[,\s]+/).filter(Boolean));
        i += 1;
      }
      continue;
    }
    if (arg.startsWith("--filter=")) {
      cliTokens.push(...arg.slice("--filter=".length).split(/[,\s]+/).filter(Boolean));
      continue;
    }
    if (arg && arg !== "--" && !arg.startsWith("-")) {
      cliTokens.push(arg);
    }
  }

  const envTokens = [
    ...(process.env.CKE_IMPORT_FILTER ?? "").split(/[,\s]+/),
    ...(process.env.CKE_IMPORT_SCOPE ?? "").split(/[,\s]+/),
  ]
    .map((t) => t.trim())
    .filter(Boolean);

  const tokens = [...cliTokens, ...envTokens];

  if (tokens.length === 0) {
    return {
      active: false,
      fixtures: new Set(),
      categories: new Set(),
      matches: () => true,
      describe: () => "full suite",
    };
  }

  const { fixtures, categories, unknown } = resolveScopeTokens(tokens);

  if (fixtures.size === 0 && unknown.length > 0) {
    printScopeHelp(unknown);
    process.exitCode = 1;
    throw new Error(`Unknown scope filter(s): ${unknown.join(", ")}`);
  }

  if (fixtures.size === 0) {
    printScopeHelp(unknown);
    process.exitCode = 1;
    throw new Error("Scope filter matched no fixtures.");
  }

  const fixtureSet = fixtures;
  const categorySet = categories;

  return {
    active: true,
    fixtures: fixtureSet,
    categories: categorySet,
    matches(...tags) {
      for (const raw of tags) {
        const tag = normalizeToken(raw);
        if (fixtureSet.has(tag)) return true;
        if (categorySet.has(tag)) return true;
        if (tag === "18" && categorySet.has("18")) return true;
        const mapped = ALIAS_TO_CATEGORY.get(tag);
        if (mapped && categorySet.has(mapped)) return true;
        const fixtureCategories = FIXTURE_TO_CATEGORIES.get(tag);
        if (fixtureCategories) {
          for (const cat of fixtureCategories) {
            if (categorySet.has(cat)) return true;
          }
        }
      }
      return false;
    },
    describe() {
      const names = [...fixtureSet].sort();
      const cats = [...categorySet].sort();
      return `fixtures=[${names.join(", ")}] categories=[${cats.join(", ")}]`;
    },
  };
}

export function printScopeHelp(unknown = []) {
  const fixtures = listVisionFixtureNamesFromDisk();
  console.error("\nCKE import scoped test — unknown or empty filter.");
  if (unknown.length > 0) {
    console.error(`  Unknown token(s): ${unknown.join(", ")}`);
  }
  console.error("\nCategories (npm run test:cke-import -- <name>):");
  for (const [key, meta] of Object.entries(CATEGORY_CATALOG)) {
    console.error(`  ${key.padEnd(16)} ${meta.label}`);
    console.error(`  ${"".padEnd(16)} fixtures: ${meta.fixtures.join(", ")}`);
  }
  console.error("\nTask 18 bundle:");
  console.error(`  18, task-18  →  ${TASK_18_FIXTURES.join(", ")}`);
  console.error("\nTask 12 bundle:");
  console.error(`  12, task-12  →  ${TASK_12_FIXTURES.join(", ")}`);
  console.error("\nAll vision fixtures:");
  for (const name of fixtures) {
    console.error(`  ${name}`);
  }
  console.error("\nExamples:");
  console.error("  npm run test:cke-import -- 18");
  console.error("  npm run test:cke-import -- true-false");
  console.error("  npm run test:cke-import -- geometry");
  console.error("  npm run test:cke-import -- task-18-mc");
  console.error("  npm run test:cke-import -- --filter true-false");
  console.error("  CKE_IMPORT_FILTER=matching npm run test:cke-import");
  console.error("  CKE_IMPORT_SCOPE=geometry npm run test:cke-import");
  console.error("\nFull regression (no filter): npm run test:cke-import\n");
}
