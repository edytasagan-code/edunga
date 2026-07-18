import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import type { DocumentDisplayOptions } from "@/app/lib/documentGenerator";
import {
  defaultDocumentDisplayOptions,
} from "@/app/lib/documentGenerator";
import { generateDocumentPdf } from "@/app/lib/pdf/generateDocumentPdf";
import {
  buildPdfLayoutPages,
  buildSubtaskPerCellPdfPages,
  defaultPrintLayoutOptions,
  normalizePrintLayout,
  applyMeasuredCellScales,
  isSubtaskPerCellLayout,
  isSubtaskGridLayout,
} from "@/app/lib/printLayout";
import type {
  PdfDocumentData,
  PdfExportRequest,
  PdfExportVersion,
  PdfLayoutPage,
} from "@/app/lib/pdf/types";
import { normalizeVariants } from "@/app/lib/variants";

export const runtime = "nodejs";

function safeFilename(title: string): string {
  const base =
    title
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "dokument";

  return `${base}.pdf`;
}

function resolveTaskValue(
  item: Extract<PdfExportVersion["items"][number], { kind: "task" }>,
  taskMap: Map<
    string,
    {
      warianty?: unknown;
      tresc: unknown;
      rozwiazanie?: unknown;
      odpowiedz?: unknown;
    }
  >
): unknown {
  if (item.document !== undefined && item.document !== null) {
    return item.document;
  }

  const zadanie = taskMap.get(item.taskId);

  if (!zadanie) {
    return null;
  }

  const variants = normalizeVariants(zadanie);
  return variants[item.variantIndex]?.tresc ?? variants[0]?.tresc ?? null;
}

function mergeDisplay(
  display?: Partial<DocumentDisplayOptions>
): DocumentDisplayOptions {
  return {
    ...defaultDocumentDisplayOptions(),
    ...display,
    date: display?.date ?? "",
  };
}

function buildPdfVersion(
  version: PdfExportVersion,
  taskMap: Map<
    string,
    {
      warianty?: unknown;
      tresc: unknown;
      rozwiazanie?: unknown;
      odpowiedz?: unknown;
    }
  >,
  subtaskGridLayout: boolean
): PdfDocumentData {
  const display = mergeDisplay(version.display);
  let taskNumber = 0;

  const items = version.items.map((item) => {
    if (item.kind === "answer-area") {
      return {
        kind: "answer-area" as const,
        areaType: item.areaType,
        answerHeightPx: item.answerHeightPx,
      };
    }

    taskNumber += 1;

    return {
      kind: "task" as const,
      number: taskNumber,
      value: resolveTaskValue(item, taskMap),
      subtaskGridOffsets: item.subtaskGridOffsets,
    };
  });

  return {
    title: "",
    display,
    items,
    subtaskGridLayout,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PdfExportRequest;

    const exportVersions: PdfExportVersion[] = body.versions?.length
      ? body.versions
      : body.items?.length
        ? [{ display: body.display, items: body.items }]
        : [];

    if (exportVersions.length === 0) {
      return NextResponse.json(
        { error: "Dokument nie zawiera elementów." },
        { status: 400 }
      );
    }

    const taskIds = [
      ...new Set(
        exportVersions.flatMap((version) =>
          version.items
            .filter((item): item is Extract<typeof item, { kind: "task" }> =>
              item.kind === "task"
            )
            .map((item) => item.taskId)
        )
      ),
    ];

    const zadania =
      taskIds.length > 0
        ? await prisma.zadanie.findMany({
            where: {
              id: {
                in: taskIds,
              },
            },
          })
        : [];

    const taskMap = new Map(zadania.map((zadanie) => [zadanie.id, zadanie]));

    const printLayout = normalizePrintLayout(
      body.printLayout ?? defaultPrintLayoutOptions(),
      Math.max(
        1,
        ...exportVersions.map(
          (version) =>
            version.items.filter((item) => item.kind === "task").length
        )
      )
    );

    const subtaskGridLayout = isSubtaskGridLayout(printLayout.grid);

    const pdfVersions = exportVersions.map((version) =>
      buildPdfVersion(version, taskMap, subtaskGridLayout)
    );

    for (const version of pdfVersions) {
      version.title = body.title ?? "";
    }

    const layoutPages = applyMeasuredCellScales(
      pdfVersions.flatMap((version, versionIndex) =>
        isSubtaskPerCellLayout(printLayout.grid)
          ? buildSubtaskPerCellPdfPages(
              exportVersions[versionIndex],
              printLayout,
              taskMap,
              body.title ?? ""
            )
          : buildPdfLayoutPages(version, printLayout)
      ),
      body.measuredCellScales
    );

    const pdf = await generateDocumentPdf({ pages: layoutPages });

    const filename = safeFilename(body.title ?? "dokument");

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Nie udało się wygenerować PDF." },
      { status: 500 }
    );
  }
}
