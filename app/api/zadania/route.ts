import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const zadania = await prisma.zadanie.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(zadania);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Błąd pobierania zadań" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const zadanie = await prisma.zadanie.create({
      data: {
        klasaId: body.klasaId,
        dzialId: body.dzialId,
        tematId: body.tematId,

        typ: body.typ,
        poziom: body.poziom,

        punkty: body.punkty,
        czas: body.czas,

        tresc: body.tresc,
        odpowiedz: body.odpowiedz,
        rozwiazanie: body.rozwiazanie,

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