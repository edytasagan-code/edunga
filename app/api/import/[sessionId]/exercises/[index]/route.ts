import { NextResponse } from "next/server";

import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import { ensureDocumentInlineEditing } from "@/app/components/editor/core/document";
import { updateImportExercise } from "@/app/lib/import/sessionStore";
import type { ParsedExercise } from "@/app/lib/import/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string; index: string }>;
};

function loadDocument(value: unknown) {
  const document = parseEditorDocument(value);

  if (!document) {
    return null;
  }

  return ensureDocumentInlineEditing(document);
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { sessionId, index } = await context.params;
  const exerciseIndex = Number(index);

  if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0) {
    return NextResponse.json(
      { error: "Nieprawidłowy indeks zadania." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as Partial<ParsedExercise>;
    const patch: Partial<ParsedExercise> = {};

    if (body.number !== undefined) {
      patch.number = body.number;
    }

    if (body.selected !== undefined) {
      patch.selected = body.selected;
    }

    if (body.saved !== undefined) {
      patch.saved = body.saved;
    }

    if (body.savedTaskId !== undefined) {
      patch.savedTaskId = body.savedTaskId;
    }

    if (body.savedKod !== undefined) {
      patch.savedKod = body.savedKod;
    }

    if (body.level !== undefined) {
      patch.level = body.level;
      patch.levelDetected = body.level !== null;
    }

    if (body.levelDetected !== undefined) {
      patch.levelDetected = body.levelDetected;
    }

    if (body.poziom !== undefined) {
      patch.poziom =
        body.poziom === null || body.poziom === undefined
          ? null
          : Number(body.poziom);
    }

    if (body.punkty !== undefined) {
      patch.punkty =
        body.punkty === null || body.punkty === undefined
          ? null
          : Number(body.punkty);
    }

    if (body.czas !== undefined) {
      patch.czas =
        body.czas === null || body.czas === undefined
          ? null
          : Number(body.czas);
    }

    if (body.tresc !== undefined) {
      const document = loadDocument(body.tresc);

      if (!document) {
        return NextResponse.json(
          { error: "Nieprawidłowa treść zadania." },
          { status: 400 }
        );
      }

      patch.tresc = document;
    }

    if (body.rozwiazanie !== undefined) {
      const document = loadDocument(body.rozwiazanie);

      if (!document) {
        return NextResponse.json(
          { error: "Nieprawidłowe rozwiązanie." },
          { status: 400 }
        );
      }

      patch.rozwiazanie = document;
    }

    if (body.odpowiedz !== undefined) {
      const document = loadDocument(body.odpowiedz);

      if (!document) {
        return NextResponse.json(
          { error: "Nieprawidłowa odpowiedź." },
          { status: 400 }
        );
      }

      patch.odpowiedz = document;
    }

    if (body.metadataOverrides !== undefined) {
      patch.metadataOverrides = body.metadataOverrides;
    }

    if (body.identifikatorPp !== undefined) {
      patch.identifikatorPp = body.identifikatorPp;
    }

    if (body.identifikatorPr !== undefined) {
      patch.identifikatorPr = body.identifikatorPr;
    }

    const session = updateImportExercise(
      sessionId,
      exerciseIndex,
      patch
    );

    if (!session) {
      return NextResponse.json(
        { error: "Sesja importu wygasła lub nie istnieje." },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Import exercise update failed:", error);

    return NextResponse.json(
      { error: "Nie udało się zaktualizować zadania." },
      { status: 500 }
    );
  }
}
