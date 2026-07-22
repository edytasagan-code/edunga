import { NextResponse } from "next/server";

import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import { ensureDocumentInlineEditing } from "@/app/components/editor/core/document";
import { prisma } from "@/app/lib/prisma";
import {
  checkExerciseDuplicate,
  type DuplicateDecision,
} from "@/app/lib/import/duplicateCheck";
import {
  getImportSession,
  updateImportExercise,
} from "@/app/lib/import/sessionStore";
import { buildImportedTaskPayload } from "@/app/lib/import/saveExercise";
import {
  exerciseScopeIsComplete,
  resolveExerciseScope,
} from "@/app/lib/import/exerciseMetadata";
import type { ExerciseLevel } from "@/app/lib/import/types";
import { allocateTaskCode } from "@/app/lib/taskCode";
import {
  normalizeTaskIdentifier,
  normalizeTaskSource,
} from "@/app/lib/taskSource";
import { primaryVariantFields } from "@/app/lib/zadanieVariants";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

function isExerciseLevel(value: unknown): value is ExerciseLevel {
  return value === "basic" || value === "extended";
}

function isDuplicateDecision(value: unknown): value is DuplicateDecision {
  return value === "skip" || value === "replace" || value === "save";
}

function resolveDuplicateDecision(
  status: "new" | "exact" | "content",
  requested: DuplicateDecision | undefined
): DuplicateDecision {
  if (requested && isDuplicateDecision(requested)) {
    return requested;
  }

  if (status === "exact") {
    return "skip";
  }

  return "save";
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { sessionId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      exerciseIndexes?: number[];
      onlySelected?: boolean;
      duplicateDecisions?: Record<string, DuplicateDecision>;
    };

    const session = getImportSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Sesja importu wygasła lub nie istnieje." },
        { status: 404 }
      );
    }

    const metadata = session.metadata;

    if (!metadata.klasaId || !metadata.dzialId || !metadata.tematId) {
      return NextResponse.json(
        {
          error:
            "Uzupełnij domyślne metadane importu (klasa, dział, temat).",
        },
        { status: 400 }
      );
    }

    const targetIndexes =
      body.exerciseIndexes ??
      session.exercises
        .filter((exercise) =>
          body.onlySelected === false ? true : exercise.selected
        )
        .filter((exercise) => !exercise.saved)
        .map((exercise) => exercise.index);

    const saved: Array<{
      index: number;
      id: string;
      kod: string;
      identyfikator: string | null;
      level: ExerciseLevel | null;
      replaced?: boolean;
    }> = [];

    const skipped: Array<{ index: number; reason: string }> = [];

    for (const exerciseIndex of targetIndexes) {
      const exercise = session.exercises.find(
        (item) => item.index === exerciseIndex
      );

      if (!exercise) {
        skipped.push({ index: exerciseIndex, reason: "not-found" });
        continue;
      }

      if (exercise.saved) {
        skipped.push({ index: exerciseIndex, reason: "already-saved" });
        continue;
      }

      if (!exercise.selected && body.onlySelected !== false) {
        skipped.push({ index: exerciseIndex, reason: "not-selected" });
        continue;
      }

      const tresc = parseEditorDocument(exercise.tresc);
      const rozwiazanie = parseEditorDocument(exercise.rozwiazanie);
      const odpowiedz = parseEditorDocument(exercise.odpowiedz);

      if (!tresc) {
        skipped.push({ index: exerciseIndex, reason: "invalid-content" });
        continue;
      }

      const exerciseMetadata = resolveExerciseScope(session.metadata, exercise);

      if (!exerciseScopeIsComplete(exerciseMetadata)) {
        skipped.push({ index: exerciseIndex, reason: "incomplete-metadata" });
        continue;
      }

      const duplicate = await checkExerciseDuplicate(
        session.metadata,
        exercise,
        session.exercises
      );
      const decision = resolveDuplicateDecision(
        duplicate.status,
        body.duplicateDecisions?.[String(exerciseIndex)]
      );

      if (decision === "skip" && duplicate.status !== "new") {
        skipped.push({
          index: exerciseIndex,
          reason: `duplicate-${duplicate.status}`,
        });
        continue;
      }

      const payload = buildImportedTaskPayload(
        exerciseMetadata,
        {
          ...exercise,
          tresc: ensureDocumentInlineEditing(tresc),
          rozwiazanie: ensureDocumentInlineEditing(
            rozwiazanie ?? { version: 1, paragraphs: [] }
          ),
          odpowiedz: ensureDocumentInlineEditing(
            odpowiedz ?? { version: 1, paragraphs: [] }
          ),
        },
        session.exercises
      );
      const content = primaryVariantFields(payload.warianty);

      const taskData = {
        klasaId: payload.klasaId,
        dzialId: payload.dzialId,
        tematId: payload.tematId,
        typ: payload.typ,
        poziom: payload.poziom,
        punkty: payload.punkty,
        czas: payload.czas,
        zrodlo: normalizeTaskSource(payload.zrodlo) || null,
        identyfikator:
          normalizeTaskIdentifier(payload.identyfikator) || null,
        identifikatorPp:
          normalizeTaskIdentifier(payload.identifikatorPp) || null,
        identifikatorPr:
          normalizeTaskIdentifier(payload.identifikatorPr) || null,
        rokEgzaminu: payload.rokEgzaminu ?? null,
        sesjaEgzaminu: payload.sesjaEgzaminu ?? null,
        poziomEgzaminu: payload.poziomEgzaminu ?? null,
        tresc: content.tresc,
        rozwiazanie: content.rozwiazanie,
        odpowiedz: content.odpowiedz,
        warianty: content.warianty,
        tagi: payload.tagi,
        autor: "import",
      };

      let persisted:
        | { id: string; kod: string; identyfikator: string | null }
        | null = null;
      let replaced = false;

      if (
        decision === "replace" &&
        duplicate.existing &&
        duplicate.status !== "new"
      ) {
        persisted = await prisma.zadanie.update({
          where: { id: duplicate.existing.id },
          data: taskData,
          select: {
            id: true,
            kod: true,
            identyfikator: true,
          },
        });
        replaced = true;
      } else {
        const kod = await allocateTaskCode(prisma);
        persisted = await prisma.zadanie.create({
          data: {
            kod,
            ...taskData,
          },
          select: {
            id: true,
            kod: true,
            identyfikator: true,
          },
        });
      }

      updateImportExercise(sessionId, exerciseIndex, {
        saved: true,
        savedTaskId: persisted.id,
        savedKod: persisted.kod,
      });

      saved.push({
        index: exerciseIndex,
        id: persisted.id,
        kod: persisted.kod,
        identyfikator: persisted.identyfikator,
        level: isExerciseLevel(exercise.level) ? exercise.level : null,
        replaced,
      });
    }

    const refreshed = getImportSession(sessionId);

    return NextResponse.json({
      saved,
      skipped,
      session: refreshed,
    });
  } catch (error) {
    console.error("Import batch save failed:", error);

    return NextResponse.json(
      { error: "Nie udało się zapisać zadań z importu." },
      { status: 500 }
    );
  }
}
