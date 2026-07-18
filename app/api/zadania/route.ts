import { NextResponse } from "next/server";
import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";
import { allocateTaskCode } from "@/app/lib/taskCode";
import {
  normalizeTaskIdentifier,
  normalizeTaskSource,
} from "@/app/lib/taskSource";
import {
  parseVariantsFromBody,
  primaryVariantFields,
} from "@/app/lib/zadanieVariants";

export async function GET() {
  try {
    const zadania = await prisma.zadanie.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        mainTopic: {
          select: { id: true, nazwa: true },
        },
        subtopic: {
          select: { id: true, nazwa: true },
        },
      },
    });

    return NextResponse.json(zadania);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania zadań.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const warianty = parseVariantsFromBody(body);
    const content = primaryVariantFields(warianty);

    const kod = await allocateTaskCode(prisma);

    const zadanie = await prisma.zadanie.create({
      data: {
        kod,
        klasaId: body.klasaId || null,
        dzialId: body.dzialId || null,
        tematId: body.tematId || null,

        mainTopicId: body.mainTopicId || null,
        subtopicId: body.subtopicId || null,
        zagadnienie:
          typeof body.zagadnienie === "string"
            ? body.zagadnienie.trim() || null
            : null,

        typ: body.typ || "",
        poziom: Number(body.poziom) || 0,

        punkty: Number(body.punkty) || 0,
        czas: Number(body.czas) || 0,

        zrodlo: normalizeTaskSource(body.zrodlo) || null,
        identyfikator:
          normalizeTaskIdentifier(body.identyfikator) || null,

        tresc: content.tresc,
        odpowiedz: content.odpowiedz,
        rozwiazanie: content.rozwiazanie,
        warianty: content.warianty,

        tagi: body.tagi ?? [],

        autor: "admin",
      },
    });

    return NextResponse.json(zadanie);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Błąd zapisu zadania" },
      { status: 500 }
    );
  }
}