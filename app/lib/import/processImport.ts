import { parseExercisesWithAi } from "./aiParser";
import { applyCkeSourceIdentifiers } from "./ckeIdentifier";
import { shouldAllowCkeTextParserFallback } from "./ckeImportRouting";
import { isCkeMaturaText } from "./ckeTextParser";
import { detectSourceMetadataFromImport } from "@/app/lib/sourceMetadataDetect";
import { extractTextFromPdf } from "./pdfExtract";
import { createImportSession } from "./sessionStore";
import { normalizeImportSessionMetadata } from "./exerciseMetadata";
import type { ImportProcessResult } from "./types";
import { DEFAULT_IMPORT_METADATA } from "./types";

export async function processPdfImport(
  fileName: string,
  buffer: Buffer
): Promise<ImportProcessResult> {
  const extraction = await extractTextFromPdf(buffer, { fileName });
  const metadataText = extraction.pdfText ?? extraction.text;
  const isCkeImport = isCkeMaturaText(metadataText, fileName);

  const parsed = await parseExercisesWithAi(extraction.text, {
    ocrPages: extraction.ocrPages,
    pazdroBlocks: extraction.pazdroBlocks,
    extractionMethod: extraction.method,
    reconstructMath:
      extraction.method === "pdf-text" &&
      isCkeImport &&
      shouldAllowCkeTextParserFallback(extraction.method),
    fileName,
  });

  const detectedMetadata = detectSourceMetadataFromImport(
    fileName,
    metadataText
  );

  const metadata = normalizeImportSessionMetadata({
    ...DEFAULT_IMPORT_METADATA,
    ...detectedMetadata,
    sourceMetadata: {
      ...DEFAULT_IMPORT_METADATA.sourceMetadata,
      ...detectedMetadata.sourceMetadata,
    },
  });

  const exercises = applyCkeSourceIdentifiers(parsed.exercises, metadata);

  const session = createImportSession({
    fileName,
    extractionMethod: extraction.method,
    pageCount: extraction.pageCount,
    rawText: metadataText,
    ocrWarnings: extraction.warnings,
    parseWarnings: parsed.warnings,
    aiUsed: parsed.aiUsed,
    exercises,
    metadata,
  });

  return {
    sessionId: session.id,
    fileName: session.fileName,
    extractionMethod: session.extractionMethod,
    pageCount: session.pageCount,
    exerciseCount: session.exercises.length,
    aiUsed: session.aiUsed,
    visionEnhancementStatus: "none",
    warnings: [...session.ocrWarnings, ...session.parseWarnings],
  };
}
