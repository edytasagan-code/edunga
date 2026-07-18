import { renderToBuffer } from "@react-pdf/renderer";

import { createElement } from "react";

import { MultiDocumentPdf } from "./DocumentPdf";

import { buildPdfMathRenderCache } from "./buildPdfMathRenderCache";

import { logPdfTaskDocuments } from "./logPdfTaskDocument";

import { registerPdfBodyFont } from "./registerPdfBodyFont";

import { layoutPdfPageItems } from "@/app/lib/printLayout";
import type { PdfLayoutPage } from "./types";

export type GenerateDocumentPdfInput = {
  pages: PdfLayoutPage[];
};

export async function generateDocumentPdf(
  input: GenerateDocumentPdfInput
): Promise<Buffer> {
  registerPdfBodyFont();

  const { pages } = input;

  for (const page of pages) {
    const items = layoutPdfPageItems(page);
    const taskItems = items.filter((item) => item.kind === "task");
    logPdfTaskDocuments(taskItems);
  }

  const mathCaches = await Promise.all(
    pages.map((page) => {
      const items = layoutPdfPageItems(page);
      const uniqueValues = [
        ...new Set(
          items
            .filter((item) => item.kind === "task")
            .map((task) => task.value)
        ),
      ];

      return buildPdfMathRenderCache(uniqueValues);
    })
  );

  const element = createElement(MultiDocumentPdf, {
    pages,
    mathCaches,
  });

  const buffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0]
  );

  return Buffer.from(buffer);
}
