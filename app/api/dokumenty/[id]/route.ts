import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import {
  documentWritePayloadToPrismaData,
  parseDocumentWriteBody,
  savedDocumentFromDb,
} from "@/app/lib/documentProject";
import { prisma } from "@/app/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const record = await prisma.dokument.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Nie znaleziono dokumentu." },
        { status: 404 }
      );
    }

    const parsed = savedDocumentFromDb(record);

    if (!parsed) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane dokumentu." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd wczytywania dokumentu.");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = parseDocumentWriteBody(body);

    if (!payload) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane dokumentu." },
        { status: 400 }
      );
    }

    const updated = await prisma.dokument.update({
      where: { id },
      data: documentWritePayloadToPrismaData(payload),
    });

    const record = savedDocumentFromDb(updated);

    if (!record) {
      return NextResponse.json(
        { error: "Nie udało się zaktualizować dokumentu." },
        { status: 500 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd aktualizacji dokumentu.");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: {
      tytul?: string;
      zarchiwizowany?: boolean;
    } = {};

    if (typeof body.tytul === "string") {
      const trimmed = body.tytul.trim();
      data.tytul = trimmed || "Bez tytułu";
    }

    if (typeof body.zarchiwizowany === "boolean") {
      data.zarchiwizowany = body.zarchiwizowany;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Brak pól do aktualizacji." },
        { status: 400 }
      );
    }

    const updated = await prisma.dokument.update({
      where: { id },
      data,
    });

    const record = savedDocumentFromDb(updated);

    if (!record) {
      return NextResponse.json(
        { error: "Nie udało się zaktualizować dokumentu." },
        { status: 500 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd aktualizacji dokumentu.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    await prisma.dokument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return prismaErrorResponse(error, "Błąd usuwania dokumentu.");
  }
}
