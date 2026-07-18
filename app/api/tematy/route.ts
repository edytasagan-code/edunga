import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dzialId = searchParams.get("dzialId");

  if (!dzialId) {
    return NextResponse.json(
      { error: "Parametr dzialId jest wymagany." },
      { status: 400 }
    );
  }

  try {
    const tematy = await prisma.temat.findMany({
      where: { dzialId },
      orderBy: [{ kolejnosc: "asc" }, { nazwa: "asc" }],
      select: {
        id: true,
        nazwa: true,
        dzialId: true,
        kolejnosc: true,
      },
    });

    return NextResponse.json(tematy);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania tematów.");
  }
}
