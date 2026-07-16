import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { VisionExercise, VisionPageResult } from "./visionExtract";

const FIXTURES_DIR = join(process.cwd(), "scripts/fixtures/cke-import/vision");

let fixtureCache: Map<string, VisionExercise> | null = null;

function loadAllFixtures(): Map<string, VisionExercise> {
  if (fixtureCache) {
    return fixtureCache;
  }

  fixtureCache = new Map();

  if (!existsSync(FIXTURES_DIR)) {
    return fixtureCache;
  }

  for (const file of readdirSync(FIXTURES_DIR)) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const name = file.replace(/\.json$/, "");
    const raw = readFileSync(join(FIXTURES_DIR, file), "utf8");
    fixtureCache.set(name, JSON.parse(raw) as VisionExercise);
  }

  return fixtureCache;
}

/** Clear cache — for tests that swap fixture files. */
export function resetVisionFixtureCache(): void {
  fixtureCache = null;
}

/**
 * Optional page → fixture mapping for mock Vision during dev.
 * Format: "1:task-18-mc,2:task-pf" or "1:task-18-mc;task-pf"
 */
function parseMockPageMap(): Map<number, string[]> {
  const env = process.env.CKE_IMPORT_MOCK_PAGES?.trim();
  const map = new Map<number, string[]>();

  if (!env) {
    return map;
  }

  for (const segment of env.split(",")) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const pageNum = Number.parseInt(trimmed.slice(0, colonIndex).trim(), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      continue;
    }

    const names = trimmed
      .slice(colonIndex + 1)
      .split(";")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length > 0) {
      map.set(pageNum, names);
    }
  }

  return map;
}

export function loadVisionFixtureByName(name: string): VisionExercise | null {
  return loadAllFixtures().get(name) ?? null;
}

export function listVisionFixtureNames(): string[] {
  return [...loadAllFixtures().keys()].sort();
}

/**
 * Mock Vision page extraction — no OpenAI call.
 * Returns fixtures mapped via CKE_IMPORT_MOCK_PAGES, otherwise empty exercises.
 */
export function extractExercisesFromPageImageMock(
  pageIndex: number
): VisionPageResult {
  const fixtures = loadAllFixtures();
  const pageMap = parseMockPageMap();
  const fixtureNames = pageMap.get(pageIndex) ?? [];
  const exercises: VisionExercise[] = [];

  for (const name of fixtureNames) {
    const exercise = fixtures.get(name);
    if (exercise) {
      exercises.push(exercise);
    }
  }

  return {
    sourcePage: `mock-page-${pageIndex}`,
    exercises,
  };
}
