const PAGE_ERROR_PREFIX = "Vision AI — strona ";

export function isFatalVisionApiError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("429") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("invalid_api_key") ||
    normalized.includes("incorrect api key") ||
    normalized.includes("brak openai_api_key") ||
    /\b401\b/.test(message)
  );
}

export function extractVisionPageErrorDetails(warnings: string[]): string[] {
  return warnings
    .filter((warning) => warning.startsWith(PAGE_ERROR_PREFIX))
    .map((warning) =>
      warning.replace(/^Vision AI — strona \d+: /, "").trim()
    );
}

export function buildVisionEmptyFailureMessage(
  warnings: string[],
  pageCount: number
): string {
  const pageErrors = extractVisionPageErrorDetails(warnings);
  const uniqueDetails = [...new Set(pageErrors)];

  if (uniqueDetails.length === 0) {
    return "Vision AI nie zwróciło żadnej treści z pliku PDF. Import przerwany — sprawdź log Vision worker.";
  }

  const detail = uniqueDetails.join(" ");

  if (pageCount > 0 && pageErrors.length >= pageCount) {
    return `Vision AI nie zwróciło żadnej treści — wszystkie ${pageCount} stron zakończyły się błędem: ${detail}`;
  }

  return `Vision AI nie zwróciło żadnej treści (${pageErrors.length} stron z błędem): ${detail}`;
}
