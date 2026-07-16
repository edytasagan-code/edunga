import { NextResponse } from "next/server";

import { prismaErrorResponse } from "@/app/lib/api/prismaError";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mainTopicId = searchParams.get("mainTopicId");

    if (!mainTopicId) {
      return NextResponse.json(
        { error: "Brak parametru mainTopicId." },
        { status: 400 }
      );
    }

    const subtopics = await prisma.subtopic.findMany({
      where: { mainTopicId },
      orderBy: { kolejnosc: "asc" },
    });

    return NextResponse.json(subtopics);
  } catch (error) {
    return prismaErrorResponse(error, "Błąd pobierania podtematów.");
  }
}
