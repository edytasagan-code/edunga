import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.mainTopic.findMany({
      orderBy: { kolejnosc: "asc" },
      include: {
        subtopics: {
          orderBy: { kolejnosc: "asc" },
        },
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania tematów.");
  }
}
