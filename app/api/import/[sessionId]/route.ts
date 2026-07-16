import { NextResponse } from "next/server";

import {
  getImportSession,
  updateImportSession,
} from "@/app/lib/import/sessionStore";
import type { ImportStep } from "@/app/lib/import/types";
import type { ImportSessionMetadata } from "@/app/lib/import/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { sessionId } = await context.params;
  const session = getImportSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: "Sesja importu wygasła lub nie istnieje." },
      { status: 404 }
    );
  }

  return NextResponse.json(session);
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { sessionId } = await context.params;

  try {
    const body = (await request.json()) as {
      metadata?: Partial<ImportSessionMetadata>;
      step?: ImportStep;
    };

    const session = updateImportSession(sessionId, {
      metadata: body.metadata,
      step: body.step,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesja importu wygasła lub nie istnieje." },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Import session update failed:", error);

    return NextResponse.json(
      { error: "Nie udało się zaktualizować sesji importu." },
      { status: 500 }
    );
  }
}
