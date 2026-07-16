import { NextResponse } from "next/server";

import { processPdfImport } from "@/app/lib/import/processImport";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Brak pliku PDF." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Dozwolone są wyłącznie pliki PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Plik jest zbyt duży (maks. 20 MB)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processPdfImport(file.name, buffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import process failed:", error);

    const message =
      error instanceof Error ? error.message : "Nie udało się przetworzyć pliku PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
