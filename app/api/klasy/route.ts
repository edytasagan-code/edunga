import { NextResponse } from "next/server";
import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const klasy = await prisma.klasa.findMany({
      orderBy: [{ kolejnosc: "asc" }, { nazwa: "asc" }],
      select: {
        id: true,
        nazwa: true,
        kolejnosc: true,
      },
    });

    return NextResponse.json(klasy);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania klas.");
  }
}