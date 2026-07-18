import { pdf } from "pdf-to-img";
import { createWorker, PSM, type Worker } from "tesseract.js";

import { getPdfJsDocInitParams } from "./pdfJsPaths";
import type { OcrExtractionResult, OcrPageResult, OcrWordBox } from "./levelDetect";

const OCR_SCALE = 2.5;
const MIN_CHARS_PER_PAGE = 80;

let sharedWorker: Worker | null = null;

type TesseractWord = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

type TesseractLine = {
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words?: TesseractWord[];
};

type TesseractBlock = {
  paragraphs?: Array<{
    lines?: TesseractLine[];
  }>;
};

async function getWorker(): Promise<Worker> {
  if (!sharedWorker) {
    sharedWorker = await createWorker("pol+eng");
    await sharedWorker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
  }

  return sharedWorker;
}

function collectWords(
  blocks: TesseractBlock[] | undefined,
  pageIndex: number
): OcrWordBox[] {
  const words: OcrWordBox[] = [];

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const lineKey = `${pageIndex}:${line.bbox?.x0 ?? 0}:${line.bbox?.y0 ?? 0}`;

        for (const word of line.words ?? []) {
          const text = word.text?.trim();

          if (!text) {
            continue;
          }

          words.push({
            text,
            bbox: word.bbox,
            pageIndex,
            lineKey,
          });
        }
      }
    }
  }

  return words;
}

export async function extractTextWithOcr(
  buffer: Buffer
): Promise<OcrExtractionResult> {
  const warnings: string[] = [];
  const pages: OcrPageResult[] = [];
  const worker = await getWorker();
  const document = await pdf(buffer, {
    scale: OCR_SCALE,
    docInitParams: getPdfJsDocInitParams(),
  });
  let pageIndex = 0;

  for await (const image of document) {
    pageIndex += 1;
    const result = await worker.recognize(image, {}, { blocks: true });
    const text = (result.data.text ?? "").trim();
    const words = collectWords(
      result.data.blocks as TesseractBlock[] | undefined,
      pageIndex
    );

    pages.push({
      pageIndex,
      text,
      words,
      image: Buffer.from(image),
    });
  }

  if (pages.length === 0) {
    warnings.push("OCR nie zwrócił żadnych stron z pliku PDF.");
  }

  const text = pages.map((page) => page.text).join("\n\n").trim();

  if (!text) {
    warnings.push(
      "OCR nie wykrył tekstu. Sprawdź jakość skanu lub popraw ręcznie w edytorze."
    );
  }

  const charsPerPage = text.length / Math.max(pages.length, 1);

  if (charsPerPage < MIN_CHARS_PER_PAGE) {
    warnings.push(
      "OCR zwrócił mało tekstu — sprawdź podgląd i popraw ręcznie w razie potrzeby."
    );
  }

  return {
    text,
    pageCount: pages.length,
    pages,
    warnings,
  };
}

export async function shutdownOcrWorker(): Promise<void> {
  if (sharedWorker) {
    await sharedWorker.terminate();
    sharedWorker = null;
  }
}

export function shouldRunOcr(text: string, pageCount: number): boolean {
  const normalized = text.trim();
  const charsPerPage = normalized.length / Math.max(pageCount, 1);
  return !normalized || charsPerPage < MIN_CHARS_PER_PAGE;
}
