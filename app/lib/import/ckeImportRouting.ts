import { isCkeMaturaText } from "./ckeTextParser";
import { isLiveVisionEnabled, mockVisionModeWarning } from "./visionLiveMode";

import type { ExtractionMethod } from "./types";

/**
 * CKE / matura exam PDFs should use the Vision pipeline even when the text
 * layer is dense — pdf-text alone cannot preserve math layout, figures, or
 * reliable multiple-choice structure.
 *
 * Vision runs in mock mode by default (fixtures); live OpenAI requires
 * CKE_IMPORT_LIVE_VISION=1.
 */
export function shouldUseVisionForCkeImport(
  text: string,
  fileName?: string | null
): boolean {
  return isCkeMaturaText(text, fileName);
}

/**
 * Ensures CKE matura PDFs do not silently fall back to the text-only parser.
 * Mock Vision is always available; live API is opt-in via CKE_IMPORT_LIVE_VISION.
 */
export function assertCkeVisionAvailable(
  text: string,
  fileName?: string | null
): void {
  if (!isCkeMaturaText(text, fileName)) {
    return;
  }

  // Vision pipeline (mock or live) is always available for CKE — no throw.
}

/** Warning shown when CKE import runs without live Vision opt-in. */
export function ckeVisionModeWarning(
  text: string,
  fileName?: string | null
): string | null {
  if (!isCkeMaturaText(text, fileName) || isLiveVisionEnabled()) {
    return null;
  }

  return mockVisionModeWarning();
}

/** Text-only CKE parser is allowed only after Vision completely failed (pdf-text path). */
export function shouldAllowCkeTextParserFallback(
  extractionMethod: ExtractionMethod
): boolean {
  return extractionMethod === "pdf-text";
}

/** @deprecated Use ckeVisionModeWarning — CKE no longer silently falls back. */
export function ckeVisionUnavailableWarning(
  text: string,
  fileName?: string | null
): string | null {
  return ckeVisionModeWarning(text, fileName);
}
