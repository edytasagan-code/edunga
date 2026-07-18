/**
 * Live OpenAI Vision is opt-in only — set CKE_IMPORT_LIVE_VISION=1.
 * Default dev/test/import uses fixture mocks (see visionMock.ts).
 */

export type VisionMode = "live" | "mock";

export function isLiveVisionEnabled(): boolean {
  return (
    process.env.CKE_IMPORT_LIVE_VISION === "1" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

export function getVisionMode(): VisionMode {
  return isLiveVisionEnabled() ? "live" : "mock";
}

export function liveVisionOptInMessage(): string {
  return (
    "Live Vision API jest wyłączone domyślnie (brak kosztów OpenAI w dev/test). " +
    "Ustaw CKE_IMPORT_LIVE_VISION=1 oraz OPENAI_API_KEY, aby uruchomić live Vision " +
    "do finalnej weryfikacji na prawdziwym PDF."
  );
}

/** Throws when code would call OpenAI without explicit opt-in. */
export function assertLiveVisionEnabled(context?: string): void {
  if (isLiveVisionEnabled()) {
    return;
  }

  const prefix = context ? `${context}: ` : "";
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (hasKey) {
    throw new Error(`${prefix}${liveVisionOptInMessage()}`);
  }

  throw new Error(
    `${prefix}Live Vision wymaga OPENAI_API_KEY oraz CKE_IMPORT_LIVE_VISION=1. ` +
      "Bez tego używany jest tryb mock (fixtures) — patrz visionMock.ts."
  );
}

export function mockVisionModeWarning(): string {
  return (
    "Vision mock mode — zwracane są fixtures (lub pusta strona). " +
    "Ustaw CKE_IMPORT_LIVE_VISION=1 dla live Vision API."
  );
}
