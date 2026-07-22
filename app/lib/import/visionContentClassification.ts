import { parseMathNotation } from "./mathNotation/parse";

const POLISH_DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const WORD_PATTERN = /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{3,}/g;

export const MEASUREMENT_UNITS =
  "cm|mm|dm|m|km|g|kg|mg|ml|l|m²|m³|cm²|cm³|°";

const MEASUREMENT_UNIT_PATTERN = new RegExp(
  `^(?:${MEASUREMENT_UNITS})$`,
  "i"
);

const MEASUREMENT_UNIT_SUFFIX = `(?=$|[^\\w])`;

const PLAIN_TEXT_FRAGMENTS = new Set([
  "cm",
  "mm",
  "km",
  "dm",
  "ml",
  "kg",
  "mg",
  "g",
  "l",
  "m",
  "m²",
  "m³",
  "cm²",
  "cm³",
  "°",
  "tak",
  "nie",
  "lub",
  "oraz",
  "np",
  "od",
  "do",
  "odpowiedź",
  "odpowiedz",
]);

const MATH_SIGNAL_PATTERN =
  /[\d√∞∪∩·∙×÷+\-*/^_{}\[\]|\\<>≤≥≠]|π|[Α-Ωα-ω]|\\pi|\d+\s+\d+\/\d|\d+\/\d|\([^)]*[\d+\-*/·√][^)]*\)/;

export function hasMathSignals(text: string): boolean {
  return MATH_SIGNAL_PATTERN.test(text.trim());
}

export function isMeasurementUnit(value: string): boolean {
  return MEASUREMENT_UNIT_PATTERN.test(value.trim());
}

export function looksLikeMeasurement(text: string): boolean {
  return new RegExp(
    `^(?<![\\d/])(?<!/)-?\\d+(?:,\\d+)?(?:\\(\\d+\\))?\\s*(?:${MEASUREMENT_UNITS})$`,
    "i"
  ).test(text.trim());
}

export function findMeasurementTextRanges(
  text: string
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const pattern = new RegExp(
    `(?<![\\d/])(?<!/)-?\\d+(?:,\\d+)?(?:\\(\\d+\\))?\\s*(?:${MEASUREMENT_UNITS})${MEASUREMENT_UNIT_SUFFIX}`,
    "gi"
  );

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? -1;

    if (index < 0) {
      continue;
    }

    ranges.push({
      start: index,
      end: index + match[0].length,
    });
  }

  return ranges;
}

export function isFullyParseableMath(value: string): boolean {
  try {
    parseMathNotation(value.trim());
    return true;
  } catch {
    return false;
  }
}

export function containsLatexEnvironment(text: string): boolean {
  const trimmed = text.trim();

  return (
    /\\begin\{[a-zA-Z*]+\}/.test(trimmed) &&
    /\\end\{[a-zA-Z*]+\}/.test(trimmed)
  );
}

export function looksLikePlainTextFragment(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  if (containsLatexEnvironment(trimmed)) {
    return false;
  }

  if (looksLikeMeasurement(trimmed)) {
    return true;
  }

  if (PLAIN_TEXT_FRAGMENTS.has(trimmed.toLowerCase())) {
    return true;
  }

  if (isMeasurementUnit(trimmed)) {
    return true;
  }

  if (POLISH_DIACRITICS.test(trimmed)) {
    return true;
  }

  if (/^[a-zA-Ząćęłńóśźż]{2,}$/.test(trimmed) && !hasMathSignals(trimmed)) {
    return true;
  }

  const words = trimmed.match(WORD_PATTERN) ?? [];

  if (words.length >= 2) {
    return true;
  }

  if (words.length === 1) {
    const [word] = words;

    if (
      word.length >= 4 &&
      !hasMathSignals(trimmed) &&
      !/\d/.test(trimmed)
    ) {
      return true;
    }
  }

  const letterCount = (trimmed.match(/[a-zA-Ząćęłńóśźż]/g) ?? []).length;
  const spaceCount = (trimmed.match(/\s/g) ?? []).length;

  if (
    spaceCount >= 2 &&
    letterCount > trimmed.length * 0.6 &&
    !hasMathSignals(trimmed)
  ) {
    return true;
  }

  return false;
}

/** @deprecated Use looksLikePlainTextFragment or shouldRenderAsMath instead. */
export function looksLikeNaturalLanguage(text: string): boolean {
  return looksLikePlainTextFragment(text);
}

export function looksLikeDisplayEquation(text: string): boolean {
  const trimmed = text.trim();

  if (containsLatexEnvironment(trimmed)) {
    return true;
  }

  if (!trimmed || !/=/.test(trimmed)) {
    return false;
  }

  if (looksLikePlainTextFragment(trimmed)) {
    return false;
  }

  if (POLISH_DIACRITICS.test(trimmed)) {
    return false;
  }

  return hasMathSignals(trimmed);
}

export function shouldRenderAsMath(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (containsLatexEnvironment(trimmed)) {
    return true;
  }

  if (looksLikePlainTextFragment(trimmed)) {
    return false;
  }

  if (looksLikeDisplayEquation(trimmed)) {
    return true;
  }

  if (!hasMathSignals(trimmed)) {
    return false;
  }

  return isFullyParseableMath(trimmed);
}

export function spanOverlapsRange(
  span: { start: number; end: number },
  range: { start: number; end: number }
): boolean {
  return span.start < range.end && span.end > range.start;
}
