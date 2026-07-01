import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

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

    return NextResponse.json(zadanie);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Nie znaleziono zadania.",
      },
      {
        status: 404,
      }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const zadanie = await prisma.zadanie.update({
      where: {
        id,
      },
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