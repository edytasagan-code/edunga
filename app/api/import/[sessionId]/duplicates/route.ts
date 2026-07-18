import { NextResponse } from "next/server";

import { checkSessionDuplicates } from "@/app/lib/import/duplicateCheck";
import { getImportSession } from "@/app/lib/import/sessionStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { sessionId } = await context.params;

  try {
    const session = getImportSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Sesja importu wygasła lub nie istnieje." },
        { status: 404 }
      );
    }

    const duplicates = await checkSessionDuplicates(
      session.metadata,
      session.exercises
    );

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Import duplicate check failed:", error);

    return NextResponse.json(
      { error: "Nie udało się sprawdzić duplikatów." },
      { status: 500 }
    );
  }
}
