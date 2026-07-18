import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { allocateDocumentCode } from "@/app/lib/documentCode";
import { savedDocumentFromDb } from "@/app/lib/documentProject";
import { prisma } from "@/app/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const source = await prisma.dokument.findUnique({
      where: { id },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Nie znaleziono dokumentu." },
        { status: 404 }
      );
    }

    const kod = await allocateDocumentCode(prisma);
    const duplicateTitle = source.tytul.trim()
      ? `${source.tytul.trim()} (kopia)`
      : "Bez tytułu (kopia)";

    const created = await prisma.dokument.create({
      data: {
        kod,
        tytul: duplicateTitle,
        typ: source.typ,
        klasa: source.klasa,
        poziom: source.poziom,
        opis: source.opis,
        wyswietlanie: source.wyswietlanie as Prisma.InputJsonValue,
        ukladWydruku: source.ukladWydruku as Prisma.InputJsonValue,
        elementy: source.elementy as Prisma.InputJsonValue,
        zarchiwizowany: false,
        autor: source.autor,
      },
    });

    const record = savedDocumentFromDb(created);

    if (!record) {
      return NextResponse.json(
        { error: "Nie udało się zduplikować dokumentu." },
        { status: 500 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd duplikowania dokumentu.");
  }
}
