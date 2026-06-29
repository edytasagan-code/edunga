import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/database/prisma";

export async function GET() {
  const klasy = await prisma.klasa.findMany({
    orderBy: {
      nazwa: "asc",
    },
  });

  return NextResponse.json(klasy);
}