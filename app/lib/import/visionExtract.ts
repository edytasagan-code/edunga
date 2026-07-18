export type VisionSubtask = {
  label: string;
  /** Type A — pure mathematical expression (e.g. 1.39, 1.41). */
  expression?: string;
  /** Type B — Polish sentence with inline math values (e.g. 1.171, 1.189). */
  text?: string;
  /** Numeric/math fragments embedded in Type B text, in order of appearance. */
  mathElements?: string[];
};

export type VisionChoice = {
  label: string;
  text?: string;
  expression?: string;
  mathElements?: string[];
};

export type VisionTrueFalseStatement = {
  label?: string;
  text?: string;
  expression?: string;
  mathElements?: string[];
};

export type VisionMatchingItem = {
  label?: string;
  text?: string;
  expression?: string;
  mathElements?: string[];
};

export type VisionMatchingOption = {
  label: string;
  text?: string;
  expression?: string;
  mathElements?: string[];
};

export type VisionAnswer = {
  label: string;
  value: string;
};

export type VisionFigure = {
  /** Placement anchor: after_instruction | after_subtask:<label> | before_choices | end */
  anchor: string;
  /** Bounding box as percentage of page width/height (0–100). */
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  alt?: string;
  /** Populated after server-side crop from page image. */
  src?: string;
  width?: number;
  height?: number;
};

export type VisionTable = {
  /** Same anchor convention as figures. */
  anchor: string;
  headers?: string[];
  rows?: string[][];
  /** Monospace-friendly fallback when cell structure is unclear. */
  textFallback?: string;
};

export type VisionExercise = {
  identifier: string;
  sectionReference?: string;
  level?: "basic" | "extended" | "unknown";
  exerciseKind?:
    | "standard"
    | "multiple_choice"
    | "true_false"
    | "matching"
    | "fill_blank";
  /** Introductory context / scenario before the main instruction (typical CKE word problems). */
  context?: string;
  instruction: string;
  /** Final closing question when distinct from instruction (typical CKE closed tasks). */
  question?: string;
  /** Page-order body paragraphs — preservation-first; overrides context/instruction/question grouping when set. */
  bodyBlocks?: string[];
  /** MC layout hint from Vision: inline when A–D on one line; per_line when stacked. */
  choicesLayout?: "per_line" | "inline";
  subtasks: VisionSubtask[];
  choices?: VisionChoice[];
  statements?: VisionTrueFalseStatement[];
  matchingItems?: VisionMatchingItem[];
  matchingOptions?: VisionMatchingOption[];
  correctChoice?: string | null;
  answers: VisionAnswer[];
  /** Legacy / alternate Vision field for single-answer exercises */
  answer?: string;
  figures?: VisionFigure[];
  tables?: VisionTable[];
  /** Pazdro PP (profil podstawowy), e.g. 1.171 */
  sourceIdentifierBasic?: string | null;
  /** Pazdro PR (profil rozszerzony), e.g. 1.188 */
  sourceIdentifierExtended?: string | null;
};

export type VisionPageResult = {
  sourcePage?: string;
  exercises: VisionExercise[];
};

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
              mathElements: ["-1 3/4", "-2,5", "3 5/6", "-6"],
            },
          ],
          answers: [
            {
              label: "a",
              value: "odpowiedź jeśli widoczna na stronie",
            },
          ],
          answer: "pojedyncza odpowiedź np. 2840 zł (tylko gdy brak podpunktów a) b) c))",
        },
        {
          identifier: "1.171 1.188",
          level: "extended",
          instruction: "Wyznacz liczbę x, jeśli:",
          subtasks: [
            {
              label: "a",
              text: "przybliżenie z nadmiarem liczby x jest równe 13,6; błąd względny tego przybliżenia wynosi 0,00369",
              mathElements: ["13,6", "0,00369"],
            },
          ],
          answers: [{ label: "a", value: "13,55" }],
        },
        {
          identifier: "1.148",
          level: "basic",
          instruction: "treść zadania słownego",
          subtasks: [],
          answers: [{ label: "", value: "2840 zł" }],
        },
        {
          identifier: "12",
          exerciseKind: "multiple_choice",
          instruction: "Wartość wyrażenia 2 · 3² − 4 jest równa",
          choices: [
            { label: "A", text: "14" },
            { label: "B", text: "18" },
            { label: "C", text: "22" },
            { label: "D", text: "26" },
          ],
          subtasks: [],
          answers: [{ label: "", value: "A" }],
          correctChoice: "A",
        },
        {
          identifier: "5",
          exerciseKind: "multiple_choice",
          context:
            "Anna wpłaciła na lokatę kwotę 2000 zł. Oprocentowanie lokaty wynosi 4% w skali roku, a odsetki kapitalizowane są co roku.",
          instruction: "Dokończ zadanie. Wybierz właściwą odpowiedź spośród podanych.",
          question:
            "Po dwóch latach oszczędzania na lokacie Anna będzie miała (zgodnie z zaokrągleniem do 1 grosza)",
          choices: [
            { label: "A", text: "2081,60 zł" },
            { label: "B", text: "2160,00 zł" },
            { label: "C", text: "2163,20 zł" },
            { label: "D", text: "2240,00 zł" },
          ],
          subtasks: [],
          answers: [{ label: "", value: "C" }],
          correctChoice: "C",
        },
        {
          identifier: "18",
          exerciseKind: "true_false",
          instruction:
            "W każdym wierszu tabeli w kolumnie I wpisz właściwą odpowiedź: P — prawda, F — fałsz. Wybierz P, jeśli stwierdzenie jest prawdziwe, albo F — jeśli jest fałszywe.",
          subtasks: [],
          statements: [
            { label: "1", text: "Liczba √2 jest większa od 1,4." },
            { label: "2", text: "Suma kątów wewnętrznych trójkąta wynosi 180°." },
            { label: "3", text: "Funkcja liniowa f(x) = 2x + 1 ma miejsce zerowe w punkcie x = 0." },
          ],
          answers: [
            { label: "1", value: "P" },
            { label: "2", value: "P" },
            { label: "3", value: "F" },
          ],
        },
        {
          identifier: "8",
          instruction: "Na rysunku przedstawiono wykres funkcji f.",
          subtasks: [
            { label: "a", text: "Odczytaj wartość f(2)." },
            { label: "b", text: "Podaj argument, dla którego f(x) = 0." },
          ],
          figures: [
            {
              anchor: "after_instruction",
              bbox: { x: 15, y: 22, width: 70, height: 28 },
              alt: "wykres funkcji f",
            },
          ],
          answers: [],
        },
        {
          identifier: "13.1",
          instruction: "W kartezjańskim układzie współrzędnych dane są punkty A i B.",
          subtasks: [{ label: "I", text: "Oblicz długość odcinka AB." }],
          answers: [],
        },
      ],
    },
    null,
    2
  ),
  "",
  "Arkusze maturalne CKE (Zadanie 1., Zadanie 12., zadania 13.1 i 13.2):",
  "- identifier = numer zadania dokładnie jak na arkuszu: „12”, „13.1”, „Zadanie 8” → „8”.",
  "- Zachowaj oryginalną numerację — nie zmieniaj kolejności ani numerów.",
  "- KRYTYCZNE — pełna treść zadania od nagłówka „Zadanie X.” do opcji A–D:",
  "  bodyBlocks = opcjonalna tablica akapitów w KOLEJNOŚCI czytania ze strony (preservation-first).",
  "  Gdy bodyBlocks jest ustawione, ignoruj context/instruction/question.",
  "  context = wstęp/scenariusz (np. opis lokaty, historia zadania słownego) — jeśli występuje przed poleceniem.",
  "  instruction = polecenie główne (np. „Dokończ zadanie. Wybierz właściwą odpowiedź…”) — bez opcji A–D.",
  "  question = końcowe pytanie zamykające zadanie — jeśli występuje jako osobne zdanie po poleceniu.",
  "  NIGDY nie pomijaj wstępu ani polecenia — zachowaj WSZYSTKO między „Zadanie X.” a opcjami A. B. C. D.",
  "  Gdy brak wyraźnego podziału: zapisz całą treść w instruction (wielokrotne akapity oddziel \\n\\n).",
  "- Zadania wieloczęściowe 13.1 i 13.2 tego samego zadania głównego:",
  "  zwróć OSOBNE exercises z identifier „13.1” i „13.2” (system je połączy w jedno zadanie 13).",
  "- Podpunkty a) b) c) d) oraz I. II. III. → subtasks[] w JEDNYM exercise (NIE dziel na osobne zadania).",
  "- Punkty za zadanie (np. „0–3”) możesz dopisać na końcu instruction w nawiasie.",
  "",
  "Ilustracje, wykresy, figury geometryczne, tabele jako obraz:",
  "  figures = [{ anchor, bbox, alt }]",
  "  anchor: after_instruction | after_subtask:<label> | before_choices | end",
  "  bbox: prostokąt w % szerokości/wysokości strony (x,y = lewy górny róg, width, height).",
  "  bbox MUSI obejmować WYŁĄCZNIE samą ilustrację (wykres, rysunek, figurę geometryczną, układ współrzędnych).",
  "  WYKLUCZ z bbox cały drukowany tekst: polecenia, etykiety osi, legendy, podpisy, opcje A–D.",
  "  Tekst zadania jest już w context/instruction/question — figura to tylko ilustracja, bez powtórzonego tekstu.",
  "  alt: krótki opis figury po polsku (nie przepisuj treści zadania).",
  "  Umieszczaj figure dokładnie tam, gdzie widać ją na stronie względem treści zadania.",
  "",
  "Tabele z danymi (gdy czytelna struktura komórek):",
  "  tables = [{ anchor, headers, rows, textFallback }]",
  "  rows = tablica wierszy; każdy wiersz = tablica komórek jako string.",
  "  Jeśli tabela jest graficzna/nieczytelna → figures z bbox zamiast tables.",
  "",
  "Zasady:",
  "- Zachowaj strukturę dokumentu: polecenie, podpunkty a) b) c) d).",
  "",
  "Zadania zamknięte z opcjami A. B. C. D. (wielokrotny wybór, np. matura CKE):",
  "  exerciseKind = \"multiple_choice\"",
  "  context + instruction + question = cała treść przed opcjami (patrz przykład identifier „5” powyżej).",
  "  instruction = polecenie (bez opcji A–D); context i question osobno gdy widać wyraźny podział akapitów.",
  "  choices = [{ label: \"A\", text: \"treść opcji\" }, { label: \"B\", text: \"...\" }, ...]",
  "  choicesLayout = \"inline\" gdy opcje A–D są w jednej linii (domyślnie); \"per_line\" gdy w osobnych wierszach.",
  "  subtasks = [] — NIE myl opcji A–D z podpunktami a) b) c) d)",
  "  correctChoice = \"A\" | \"B\" | \"C\" | \"D\" jeśli widoczna poprawna odpowiedź",
  "  answers = [{ label: \"\", value: \"A\" }] — tylko litera poprawnej opcji",
  "  Opcje A–D zapisuj dokładnie jak na stronie, z pełną notacją matematyczną.",
  "",
  "Zadania Prawda/Fałsz (P/F) z tabelą stwierdzeń (np. matura CKE, Zadanie 18):",
  "  exerciseKind = \"true_false\"",
  "  instruction = polecenie (np. „Wybierz P, jeśli stwierdzenie jest prawdziwe…”) — bez wierszy tabeli.",
  "  statements = [{ label: \"1\", text: \"treść stwierdzenia\" }, { label: \"2\", text: \"...\" }, ...]",
  "  Zachowaj numerację stwierdzeń i pełną treść matematyczną w text.",
  "  subtasks = [] — NIE myl stwierdzeń P/F z podpunktami a) b) c) d)",
  "  answers = [{ label: \"1\", value: \"P\" }, { label: \"2\", value: \"F\" }, ...] — tylko P lub F",
  "  Gdy widoczna tabela z nagłówkami Stwierdzenie | P | F — każdy wiersz to jedno statements[].",
  "  Alternatywnie: tables = [{ anchor: \"after_instruction\", headers: [\"Stwierdzenie\", \"P\", \"F\"], rows: [[\"1. treść...\", \"\", \"\"], ...] }]",
  "",
  "Zadania dopasowywania (Dopasuj) z tabelą par (np. matura CKE):",
  "  exerciseKind = \"matching\"",
  "  instruction = polecenie zaczynające się od „Dopasuj…” — bez wierszy tabeli.",
  "  matchingItems = [{ label: \"1\", text: \"zdanie po lewej\" }, { label: \"2\", text: \"...\" }, ...]",
  "  matchingOptions = [{ label: \"A\", text: \"odpowiedź A\" }, { label: \"B\", text: \"...\" }, ...]",
  "  subtasks = [] — NIE myl wierszy dopasowania z podpunktami a) b) c) d)",
  "  answers = [{ label: \"1\", value: \"A\" }, { label: \"2\", value: \"C\" }, ...] — litery poprawnych par",
  "  Alternatywnie: tables = [{ anchor: \"after_instruction\", headers: [\"A. ...\", \"B. ...\"], rows: [[\"1. zdanie...\"], ...] }]",
  "",
  "Podpunkty — dwa dozwolone formaty (wybierz właściwy dla każdego podpunktu):",
  "  TYP A (wyłącznie działania/wyrażenia): użyj expression + opcjonalnie mathElements.",
  "    Przykład: expression = \"(-1 3/4) · (-2,5)\", mathElements = [\"-1 3/4\", \"-2,5\"].",
  "    Pole expression = WYŁĄCZNIE notacja matematyczna. NIE umieszczaj polskich zdań w expression.",
  "  TYP B (zdania słowne z liczbami/wzorami w tekście): użyj text + mathElements.",
  "    Przykład: text = \"przybliżenie z nadmiarem liczby x jest równe 13,6; błąd ... wynosi 0,00369\",",
  "              mathElements = [\"13,6\", \"0,00369\"] — wartości matematyczne dokładnie jak w zdaniu, w kolejności występowania.",
  "    Dla TYP B: expression = \"\" (puste lub brak pola). Całe polskie zdanie idzie do text.",
  "  NIGDY nie zostawiaj podpunktu z samym label bez expression ani text.",
  "",
  "- Polskie opisy i zdania w podpunktach słownych → subtasks[].text, NIE expression.",
  "- Polskie polecenie główne → instruction.",
  "- NIE upraszczaj notacji matematycznej. Zapisuj dokładnie tak, jak na stronie.",
  "- Liczby mieszane: zapisuj jako „całość ułamek”, np. „1 3/4”, „-1 3/4”, „3 5/6”.",
  "  NIGDY nie zamieniaj liczby mieszanej na zwykły ułamek (np. „1 3/4” to NIE „1/4” ani „7/4”).",
  "- Ułamki zwykłe: zachowaj licznik/mianownik dokładnie jak widzisz (np. „4/7”, „-42/5”).",
  "- Pierwiastki: zachowaj symbol i zawartość (np. „√6”, „-1/√6”).",
  "- Mnożenie: używaj kropki środkowej „·” jeśli tak jest na stronie (nie „*” ani „×”, chyba że tak widać).",
  "- Liczby dziesiętne: polski przecinek (np. „-2,5”, „0,375”, „1,5”). NIGDY nie zamieniaj przecinka na kropkę.",
  "- Liczby dziesiętne okresowe: zachowaj dokładnie, np. „2,(37)” — nawias po przecinku oznacza okres.",
  "- Zbiory: elementy oddzielaj średnikami „;” dokładnie jak na stronie (np. „{−√2,25; −1 3/4; −π/2}”).",
  "  NIGDY nie zamieniaj średników na przecinki w zbiorach. NIGDY nie rozdzielaj liczby dziesiętnej przez przecinek (np. „−√2,25” to jeden element, nie dwa).",
  "- Jednostki miary zapisuj jako zwykły tekst obok liczby, bez operatorów mnożenia:",
  "  np. „5,7 cm”, „1,3 cm”, „11,3 cm”, „12 kg”, „500 ml”, „90°”.",
  "  Dozwolone jednostki: cm, mm, dm, m, km, g, kg, mg, l, ml, m², cm², m³, cm³, °.",
  "  NIGDY nie rozbijaj jednostek na litery ani nie wstawiaj „·” między liczbę a jednostkę.",
  "- Zachowaj nawiasy, minuses i typografię matematyczną ze strony.",
  "- NIE musisz generować LaTeX — wystarczy wierna notacja tekstowa.",
  "- Jeśli numer ćwiczenia jest niebieski = extended, czarny = basic.",
  "- Jeśli na stronie jest kilka ćwiczeń, zwróć wszystkie.",
  "- Odpowiedzi z podpunktami (Odp. a) … b) …): answers = [{ label: \"a\", value: \"...\" }, ...].",
  "- Numery ćwiczeń Pazdro — dwa wzorce:",
  "  CASE 1: dwa numery obok siebie (np. „1.171 1.188”) → identifier = \"1.171 1.188\" (PP i PR tego samego ćwiczenia).",
  "  CASE 2: jeden numer (np. „1.188”) → identifier = \"1.188\" (tylko PR; brak PP jest normalny).",
  "- Pojedyncza odpowiedź (Odp. 2840 zł, Odp. 12%, Odp. x = 5, Odp. 3,14):",
  "  answers = [{ label: \"\", value: \"2840 zł\" }] — jeden element, label pusty, value = pełna odpowiedź.",
  "- NIE umieszczaj odpowiedzi w instruction ani subtasks — tylko w answers.",
  "- Jeśli brak odpowiedzi na stronie, answers = [].",
].join("\n");

function bufferToDataUrl(image: Buffer): string {
  return `data:image/png;base64,${image.toString("base64")}`;
}

/** Live OpenAI Vision — requires CKE_IMPORT_LIVE_VISION=1 + OPENAI_API_KEY. */
export async function extractExercisesFromPageImageLive(
  image: Buffer,
  pageIndex: number
): Promise<VisionPageResult> {
  const { assertLiveVisionEnabled } = await import("./visionLiveMode");
  assertLiveVisionEnabled(`Vision AI strona ${pageIndex}`);

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const dataUrl = bufferToDataUrl(image);

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
              "Przeanalizuj załączoną stronę podręcznika lub arkusza maturalnego CKE.",
              "Wykryj ćwiczenia i zwróć JSON ze schematu.",
              "Krytyczne: zachowaj liczby mieszane dokładnie (np. „1 3/4”, nie „1/4”).",
              "Zachowaj polskie przecinki dziesiętne, średniki w zbiorach, zapis okresu „2,(37)” oraz jednostki miary jako tekst (np. „5,7 cm”).",
              "Nie upraszczaj ułamków, pierwiastków ani operatorów — zapis wierny stronie.",
              "Dla wykresów, figur i tabel podaj figures/tables z bbox w procentach strony.",
              "Bbox figury = tylko ilustracja (wykres/rysunek), bez otaczającego drukowanego tekstu zadania.",
              "Podpunkty a) b) i I. II. trzymaj w subtasks jednego zadania; opcje A. B. C. D. w choices.",
              "Zadania P/F (Prawda/Fałsz) z tabelą stwierdzeń: exerciseKind=true_false, statements[] z numeracją.",
              "Arkusze CKE: zachowaj context (wstęp), instruction (polecenie) i question (pytanie końcowe) — cała treść przed opcjami.",
              "Odpowiedzi tylko w answers — nigdy nie usuwaj treści z context/instruction/question/subtasks/choices.",
              `Strona PDF: ${pageIndex}`,
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
    throw new Error(`Vision AI zwrócił pustą odpowiedź (strona ${pageIndex}).`);
  }

  const parsed = JSON.parse(content) as VisionPageResult;

  return {
    sourcePage: parsed.sourcePage,
    exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
  };
}

/**
 * Vision page extraction — mock fixtures by default, live API only when
 * CKE_IMPORT_LIVE_VISION=1 and OPENAI_API_KEY are set.
 */
export async function extractExercisesFromPageImage(
  image: Buffer,
  pageIndex: number
): Promise<VisionPageResult> {
  const { isLiveVisionEnabled } = await import("./visionLiveMode");

  if (isLiveVisionEnabled()) {
    return extractExercisesFromPageImageLive(image, pageIndex);
  }

  const { extractExercisesFromPageImageMock } = await import("./visionMock");
  return extractExercisesFromPageImageMock(pageIndex);
}
