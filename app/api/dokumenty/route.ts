import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { allocateDocumentCode } from "@/app/lib/documentCode";
import {
  buildDocumentLibrarySummary,
  documentWritePayloadToPrismaData,
  extractTaskIdsFromItems,
  parseDocumentWriteBody,
  savedDocumentFromDb,
} from "@/app/lib/documentProject";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get("archived");

    const where =
      archivedParam === "true"
        ? { zarchiwizowany: true }
        : archivedParam === "all"
          ? {}
          : { zarchiwizowany: false };

    const records = await prisma.dokument.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    const parsed = records
      .map(savedDocumentFromDb)
      .filter((record): record is NonNullable<typeof record> => record !== null);

    const taskIds = [
      ...new Set(parsed.flatMap((record) => extractTaskIdsFromItems(record.elementy))),
    ];

    const zadania =
      taskIds.length > 0
        ? await prisma.zadanie.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, punkty: true, czas: true },
          })
        : [];

    const taskMeta = new Map(
      zadania.map((zadanie) => [
        zadanie.id,
        { punkty: zadanie.punkty, czas: zadanie.czas },
      ])
    );

    const summaries = parsed.map((record) =>
      buildDocumentLibrarySummary(record, taskMeta)
    );

    return NextResponse.json(summaries);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania dokumentów.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = parseDocumentWriteBody(body);

    if (!payload) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane dokumentu." },
        { status: 400 }
      );
    }

    const kod = await allocateDocumentCode(prisma);

    const created = await prisma.dokument.create({
      data: {
        kod,
        ...documentWritePayloadToPrismaData(payload),
        autor: "admin",
      },
    });

    const record = savedDocumentFromDb(created);

    if (!record) {
      return NextResponse.json(
        { error: "Nie udało się zapisać dokumentu." },
        { status: 500 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd zapisu dokumentu.");
  }
}
