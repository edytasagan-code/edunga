import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type {
  ImportSession,
  ImportSessionMetadata,
  ParsedExercise,
} from "./types";
import { DEFAULT_EXERCISE_METADATA, DEFAULT_IMPORT_METADATA } from "./types";
import { normalizeImportSessionMetadata } from "./exerciseMetadata";
import { applyCkeSourceIdentifiers } from "./ckeIdentifier";

const SESSION_TTL_MS = 1000 * 60 * 60 * 4;
const SESSION_DIR = join(process.cwd(), ".import-sessions");

type StoredSession = ImportSession;

function ensureSessionDir(): void {
  mkdirSync(SESSION_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  return join(SESSION_DIR, `${sessionId}.json`);
}

function purgeExpiredSessions(): void {
  ensureSessionDir();

  const now = Date.now();

  for (const fileName of readdirSync(SESSION_DIR)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }

    const filePath = join(SESSION_DIR, fileName);

    try {
      const session = JSON.parse(
        readFileSync(filePath, "utf8")
      ) as StoredSession;
      const age = now - new Date(session.createdAt).getTime();

      if (age > SESSION_TTL_MS) {
        unlinkSync(filePath);
      }
    } catch {
      unlinkSync(filePath);
    }
  }
}

function normalizeMetadata(
  metadata: Partial<ImportSessionMetadata> & Record<string, unknown>
): ImportSessionMetadata {
  return normalizeImportSessionMetadata(metadata);
}

function normalizeExercise(
  exercise: Partial<ParsedExercise> & Pick<ParsedExercise, "index">
): ParsedExercise {
  return {
    index: exercise.index,
    number: exercise.number ?? null,
    rawText: exercise.rawText ?? "",
    confidence: exercise.confidence ?? 0,
    level: exercise.level ?? null,
    levelDetected: exercise.levelDetected ?? false,
    mathReconstructed: exercise.mathReconstructed ?? false,
    mathReconstructionMethod: exercise.mathReconstructionMethod ?? null,
    tresc: exercise.tresc ?? { version: 1, paragraphs: [] },
    rozwiazanie: exercise.rozwiazanie ?? { version: 1, paragraphs: [] },
    odpowiedz: exercise.odpowiedz ?? { version: 1, paragraphs: [] },
    selected: exercise.selected ?? true,
    saved: exercise.saved ?? false,
    savedTaskId: exercise.savedTaskId ?? null,
    savedKod: exercise.savedKod ?? null,
    poziom: exercise.poziom ?? DEFAULT_EXERCISE_METADATA.poziom,
    punkty: exercise.punkty ?? DEFAULT_EXERCISE_METADATA.punkty,
    czas: exercise.czas ?? DEFAULT_EXERCISE_METADATA.czas,
    identifikatorPp: exercise.identifikatorPp ?? null,
    identifikatorPr: exercise.identifikatorPr ?? null,
    identifikatorZrodla: exercise.identifikatorZrodla ?? null,
    metadataOverrides: exercise.metadataOverrides ?? null,
    suggestedTyp: exercise.suggestedTyp ?? null,
  };
}

function normalizeSession(session: ImportSession): ImportSession {
  return {
    ...session,
    metadata: normalizeMetadata(session.metadata),
    exercises: session.exercises.map(normalizeExercise),
    visionEnhancementStatus: session.visionEnhancementStatus ?? "none",
  };
}

function finalizeSession(session: ImportSession): ImportSession {
  return normalizeSession({
    ...session,
    exercises: applyCkeSourceIdentifiers(session.exercises, session.metadata),
  });
}

function readSession(sessionId: string): StoredSession | null {
  purgeExpiredSessions();

  try {
    const raw = readFileSync(sessionPath(sessionId), "utf8");
    return normalizeSession(JSON.parse(raw) as StoredSession);
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession): void {
  ensureSessionDir();
  writeFileSync(
    sessionPath(session.id),
    JSON.stringify(session),
    "utf8"
  );
}

export function createImportSession(input: {
  fileName: string;
  extractionMethod: ImportSession["extractionMethod"];
  pageCount: number;
  rawText: string;
  ocrWarnings: string[];
  parseWarnings: string[];
  aiUsed: boolean;
  exercises: ParsedExercise[];
  metadata?: Partial<ImportSessionMetadata>;
  visionEnhancementStatus?: ImportSession["visionEnhancementStatus"];
}): ImportSession {
  const session = finalizeSession({
    id: randomUUID(),
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
    step: "preview",
    extractionMethod: input.extractionMethod,
    pageCount: input.pageCount,
    rawText: input.rawText,
    ocrWarnings: input.ocrWarnings,
    parseWarnings: input.parseWarnings,
    aiUsed: input.aiUsed,
    visionEnhancementStatus: input.visionEnhancementStatus ?? "none",
    metadata: normalizeMetadata({
      ...DEFAULT_IMPORT_METADATA,
      ...input.metadata,
    }),
    exercises: input.exercises.map(normalizeExercise),
  });

  writeSession(session);
  return session;
}

export function getImportSession(
  sessionId: string
): ImportSession | null {
  return readSession(sessionId);
}

export function updateImportSession(
  sessionId: string,
  patch: Partial<Omit<ImportSession, "metadata">> & {
    metadata?: Partial<ImportSessionMetadata>;
  }
): ImportSession | null {
  const current = readSession(sessionId);

  if (!current) {
    return null;
  }

  const next = finalizeSession(
    normalizeSession({
      ...current,
      ...patch,
      metadata: {
        ...current.metadata,
        ...patch.metadata,
      },
      exercises: patch.exercises ?? current.exercises,
    })
  );

  writeSession(next);
  return next;
}

export function updateImportExercise(
  sessionId: string,
  exerciseIndex: number,
  patch: Partial<ParsedExercise>
): ImportSession | null {
  const session = readSession(sessionId);

  if (!session) {
    return null;
  }

  const exercises = session.exercises.map((exercise) =>
    exercise.index === exerciseIndex
      ? { ...exercise, ...patch }
      : exercise
  );

  return updateImportSession(sessionId, { exercises });
}

export function deleteImportSession(sessionId: string): void {
  try {
    unlinkSync(sessionPath(sessionId));
  } catch {
    // ignore missing session files
  }
}

export function clearImportSessions(): void {
  try {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
