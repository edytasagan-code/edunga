import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const klasaId = searchParams.get("klasaId");

  if (!klasaId) {
    return NextResponse.json(
      { error: "Parametr klasaId jest wymagany." },
      { status: 400 }
    );
  }

  try {
    const dzialy = await prisma.dzial.findMany({
      where: { klasaId },
      orderBy: [{ kolejnosc: "asc" }, { nazwa: "asc" }],
      select: {
        id: true,
        nazwa: true,
        klasaId: true,
        kolejnosc: true,
      },
    });

    return NextResponse.json(dzialy);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania działów.");
  }
}
