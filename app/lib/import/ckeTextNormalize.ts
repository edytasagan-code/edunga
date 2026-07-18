const POLISH_COMMAND_WORDS = [
  "Oblicz",
  "Wyznacz",
  "Liczba",
  "Dokończ",
  "Uzupełnij",
  "Wykaż",
  "Udowodnij",
  "Rozwiąż",
  "Wybierz",
  "Zaznacz",
  "Oceń",
  "Porównaj",
  "Sprowadź",
  "Wpisz",
  "Podaj",
  "Określ",
  "Zapisz",
  "Przekształć",
  "Zamień",
  "Dopasuj",
  "Narysuj",
] as const;

/**
 * Fixes common PDF text-layer artifacts before CKE parsing.
 */
export function normalizeCkePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00ad/g, "")
    .replace(/([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])-\n([a-ząćęłńóśźż])/g, "$1$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Repairs command words split into spaced letters by noisy extraction
 * (e.g. "Wy z nacz" → "Wyznacz").
 */
export function repairSplitPolishWords(text: string): string {
  let result = text;

  for (const word of POLISH_COMMAND_WORDS) {
    const spaced = word.split("").join("\\s+");
    result = result.replace(new RegExp(spaced, "gi"), word);

    if (word.length >= 4) {
      const head = word.slice(0, 2);
      const tail = word.slice(2);
      result = result.replace(
        new RegExp(`\\b${head}\\s+${tail}\\b`, "gi"),
        word
      );
    }

    if (word.length >= 5) {
      const head = word.slice(0, 2);
      const middle = word.slice(2, 3);
      const tail = word.slice(3);
      result = result.replace(
        new RegExp(`\\b${head}\\s+${middle}\\s+${tail}\\b`, "gi"),
        word
      );
    }
  }

  return result;
}

export function normalizeCkeImportText(text: string): string {
  return repairSplitPolishWords(normalizeCkePdfText(text));
}
