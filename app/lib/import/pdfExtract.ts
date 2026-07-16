import { PDFParse } from "pdf-parse";

import type { ExtractionMethod } from "./types";
import { shouldRunOcr } from "./pdfOcr";
import {
  assertCkeVisionAvailable,
  ckeVisionModeWarning,
  shouldUseVisionForCkeImport,
} from "./ckeImportRouting";
import { isLiveVisionEnabled } from "./visionLiveMode";
import { extractTextWithVisionInChild } from "./pdfVisionChild";
import { buildVisionEmptyFailureMessage } from "./visionFailureMessage";
import type { OcrPageResult } from "./levelDetect";

export type PdfExtractionResult = {
  text: string;
  /** Raw pdf-parse output kept for metadata when Vision runs */
  pdfText?: string;
  pageCount: number;
  method: ExtractionMethod;
  warnings: string[];
  ocrPages: OcrPageResult[];
  pazdroBlocks?: import("./pazdroParser").PazdroExerciseBlock[];
};

export async function extractPdfTextLayer(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  warnings: string[];
}> {
  const warnings: string[] = [];
  let parser: PDFParse | null = null;
  let text = "";
  let pageCount = 0;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = (result.text ?? "").trim();
    pageCount = result.total || 1;
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    warnings.push(
      "Nie udało się odczytać warstwy tekstowej PDF — uruchomiono Vision AI."
    );
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }

  return { text, pageCount, warnings };
}

export async function extractTextFromPdf(
  buffer: Buffer,
  options?: { fileName?: string | null }
): Promise<PdfExtractionResult> {
  const { text, pageCount, warnings } = await extractPdfTextLayer(buffer);
  const pdfText = text;

  assertCkeVisionAvailable(text, options?.fileName);

  const useVision =
    shouldRunOcr(text, pageCount) ||
    shouldUseVisionForCkeImport(text, options?.fileName);

  if (useVision) {
    if (shouldUseVisionForCkeImport(text, options?.fileName)) {
      warnings.push(
        isLiveVisionEnabled()
          ? "Wykryto arkusz maturalny CKE — uruchomiono live Vision (wzory, obrazki, układ ABCD)."
          : "Wykryto arkusz maturalny CKE — uruchomiono Vision mock (fixtures). Ustaw CKE_IMPORT_LIVE_VISION=1 dla live API."
      );

      const modeWarning = ckeVisionModeWarning(text, options?.fileName);
      if (modeWarning) {
        warnings.push(modeWarning);
      }
    } else if (!isLiveVisionEnabled()) {
      warnings.push(
        "Vision mock mode — ustaw CKE_IMPORT_LIVE_VISION=1 dla live Vision API na skanach PDF."
      );
    }

    const vision = await extractTextWithVisionInChild(buffer);

    if (!vision.text.trim() && vision.pazdroBlocks.length === 0) {
      throw new Error(
        buildVisionEmptyFailureMessage(vision.warnings, vision.pageCount)
      );
    }

    return {
      text: vision.text,
      pdfText,
      pageCount: vision.pageCount || pageCount,
      method: "vision",
      warnings: [...warnings, ...vision.warnings],
      ocrPages: [],
      pazdroBlocks: vision.pazdroBlocks,
    };
  }

  if (!text) {
    warnings.push(
      "Nie wykryto tekstu w PDF. Dokument może być skanem — Vision AI wymaga ręcznej weryfikacji."
    );
  }

  return {
    text,
    pdfText,
    pageCount,
    method: "pdf-text",
    warnings,
    ocrPages: [],
  };
}
