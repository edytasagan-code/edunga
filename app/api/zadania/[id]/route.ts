import { NextResponse } from "next/server";
import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";
import {
  parseVariantsFromBody,
  primaryVariantFields,
} from "@/app/lib/zadanieVariants";
import {
  normalizeTaskIdentifier,
  normalizeTaskSource,
} from "@/app/lib/taskSource";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const zadanie = await prisma.zadanie.findUnique({
      where: {
        id,
      },
    });

    if (!zadanie) {
      return NextResponse.json(
        { error: "Nie znaleziono zadania." },
        { status: 404 }
      );
    }

    return NextResponse.json(zadanie);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd wczytywania zadania.");
  }
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const warianty = parseVariantsFromBody(body);
    const content = primaryVariantFields(warianty);

    const zadanie = await prisma.zadanie.update({
      where: {
        id,
      },
      data: {
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

        tagi: body.tagi,
      },
    });

    return NextResponse.json(zadanie);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Błąd edycji zadania.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    await prisma.zadanie.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Błąd usuwania.",
      },
      {
        status: 500,
      }
    );
  }
}