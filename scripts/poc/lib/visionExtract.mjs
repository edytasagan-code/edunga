/**
 * Standalone PoC — Vision AI exercise extraction (no OCR, no EDUNGA integration).
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULT_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

const SYSTEM_PROMPT = [
  "Jesteś silnikiem analizy stron z polskich zbiorów zadań matematycznych.",
  "Analizujesz obraz strony bezpośrednio — nie wykonujesz OCR.",
  "Zwróć wyłącznie poprawny JSON zgodny ze schematem.",
  "",
  "Schemat:",
  JSON.stringify(
    {
      sourcePage: "opis strony jeśli widoczny",
      exercises: [
        {
          identifier: "1.41",
          sectionReference: "1.39",
          level: "basic | extended | unknown",
          instruction: "polska treść polecenia",
          subtasks: [
            {
              label: "a",
              expression:
                "(-1 3/4) · (-2,5) · 3 5/6 · (-6) — dokładnie jak na stronie",
              mathElements: [
                "-1 3/4",
                "-2,5",
                "3 5/6",
                "-6",
              ],
            },
          ],
          answers: [
            {
              label: "a",
              value: "odpowiedź jeśli widoczna na stronie",
            },
          ],
        },
      ],
    },
    null,
    2
  ),
  "",
  "Zasady:",
  "- Zachowaj strukturę dokumentu: polecenie, podpunkty a) b) c) d).",
  "- NIE upraszczaj notacji matematycznej. Zapisuj dokładnie tak, jak na stronie.",
  "- Liczby mieszane: zapisuj jako „całość ułamek”, np. „1 3/4”, „-1 3/4”, „3 5/6”.",
  "  NIGDY nie zamieniaj liczby mieszanej na zwykły ułamek (np. „1 3/4” to NIE „1/4” ani „7/4”).",
  "- Ułamki zwykłe: zachowaj licznik/mianownik dokładnie jak widzisz (np. „4/7”, „-42/5”).",
  "- Pierwiastki: zachowaj symbol i zawartość (np. „√6”, „-1/√6”).",
  "- Mnożenie: używaj kropki środkowej „·” jeśli tak jest na stronie (nie „*” ani „×”, chyba że tak widać).",
  "- Liczby dziesiętne: polski przecinek (np. „-2,5”, „0,375”, „1,5”).",
  "- Zachowaj nawiasy, minuses i typografię matematyczną ze strony.",
  "- NIE musisz generować LaTeX — wystarczy wierna notacja tekstowa.",
  "- Jeśli numer ćwiczenia jest niebieski = extended, czarny = basic.",
  "- Jeśli na stronie jest kilka ćwiczeń, zwróć wszystkie.",
  "- Jeśli brak odpowiedzi, answers = [].",
].join("\n");

function imageToDataUrl(imagePath) {
  const buffer = readFileSync(imagePath);
  const ext = imagePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
}

export async function extractExercisesWithVision(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Brak OPENAI_API_KEY. Ustaw klucz w .env, aby uruchomić Vision PoC."
    );
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const absolutePath = resolve(imagePath);
  const dataUrl = imageToDataUrl(absolutePath);

  const startedAt = Date.now();
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Przeanalizuj załączoną stronę podręcznika.",
              "Wykryj ćwiczenia i zwróć JSON ze schematu.",
              "Krytyczne: zachowaj liczby mieszane dokładnie (np. „1 3/4”, nie „1/4”).",
              "Nie upraszczaj ułamków, pierwiastków ani operatorów — zapis wierny stronie.",
              `Plik: ${basename(absolutePath)}`,
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Vision model returned empty response.");
  }

  const parsed = JSON.parse(content);

  return {
    pipeline: "vision-ai",
    model: DEFAULT_MODEL,
    durationMs: Date.now() - startedAt,
    imagePath: absolutePath,
    result: parsed,
    usage: response.usage ?? null,
  };
}
