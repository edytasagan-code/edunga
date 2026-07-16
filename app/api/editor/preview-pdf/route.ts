import { NextResponse } from "next/server";

import { defaultDocumentDisplayOptions } from "@/app/lib/documentGenerator";
import { generateDocumentPdf } from "@/app/lib/pdf/generateDocumentPdf";
import type { PdfLayoutPage } from "@/app/lib/printLayout";

export const runtime = "nodejs";

type PreviewRequest = {
  document?: unknown;
};

export async function POST(request: Request) {
  let body: PreviewRequest;

  try {
    body = (await request.json()) as PreviewRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.document) {
    return NextResponse.json(
      { error: "Missing document." },
      { status: 400 }
    );
  }

  const display = defaultDocumentDisplayOptions();

  const page: PdfLayoutPage = {
    kind: "standard",
    sheet: {
      title: "Podgląd",
      display: {
        ...display,
        showTitle: false,
        showDate: false,
        showStudentName: false,
        showClass: false,
        showGroup: false,
        showTotalPoints: false,
        showStudentInstructions: false,
      },
      items: [
        {
          kind: "task",
          number: 1,
          value: body.document,
        },
      ],
    },
  };

  try {
    const buffer = await generateDocumentPdf({ pages: [page] });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[editor-preview-pdf]", error);

    return NextResponse.json(
      { error: "Failed to render PDF preview." },
      { status: 500 }
    );
  }
}
