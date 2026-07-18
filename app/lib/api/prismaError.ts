import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const DATABASE_UNAVAILABLE_CODES = new Set(["P1000", "P1001", "P1002", "P1003", "P1017"]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    DATABASE_UNAVAILABLE_CODES.has(error.code)
  ) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }

  return false;
}

export function prismaErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500
) {
  console.error(error);

  if (isDatabaseUnavailableError(error)) {
    return NextResponse.json(
      {
        error:
          "Baza danych jest niedostępna. Uruchom PostgreSQL: docker compose up -d",
        code: "DATABASE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status });
}
