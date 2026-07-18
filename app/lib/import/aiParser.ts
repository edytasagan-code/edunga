import { createEmptyDocument } from "@/app/components/editor/core/document";

import type { ParsedExercise } from "./types";

import {

  detectExercisesFromText,

  rawBlocksToExercises,

  rawBlocksToExercisesWithMathReconstruction,

  type RawExerciseBlock,

} from "./exerciseParser";

import { textToEditorDocument } from "./textToDocument";

import type { OcrPageResult } from "./levelDetect";

import {

  detectPazdroExercises,

  isPazdroTextbookText,

} from "./pazdroParser";

import { parseCkeMaturaExercisesFromFile } from "./ckeTextParser";
import { shouldAllowCkeTextParserFallback } from "./ckeImportRouting";
import type { ExtractionMethod } from "./types";



export type AiParseResult = {

  exercises: ParsedExercise[];

  aiUsed: boolean;

  warnings: string[];

  mathReconstructed: boolean;

};



type AiExercisePayload = {

  number?: string | null;

  text?: string;

  latex?: string;

};



function isOpenAiConfigured(): boolean {

  return Boolean(process.env.OPENAI_API_KEY?.trim());

}



async function toExercises(

  blocks: RawExerciseBlock[],

  options?: {

    reconstructMath?: boolean;

  }

): Promise<ParsedExercise[]> {

  if (options?.reconstructMath) {

    return rawBlocksToExercisesWithMathReconstruction(blocks);

  }



  return rawBlocksToExercises(blocks);

}



function buildPrompt(rawText: string): string {

  return [

    "Przeanalizuj tekst z polskiej książki/zbioru zadań matematycznych.",

    "Wykryj pojedyncze zadania i zwróć JSON:",

    '{"exercises":[{"number":"1","text":"treść z LaTeX w $...$"}]}',

    "Zachowaj symbole matematyczne jako LaTeX w $...$.",

    "Nie dodawaj rozwiązań.",

    "",

    "TEKST:",

    rawText.slice(0, 12000),

  ].join("\n");

}



async function parseWithOpenAi(

  rawText: string

): Promise<RawExerciseBlock[] | null> {

  if (!isOpenAiConfigured()) {

    return null;

  }



  try {

    const { default: OpenAI } = await import("openai");

    const client = new OpenAI({

      apiKey: process.env.OPENAI_API_KEY,

    });



    const response = await client.chat.completions.create({

      model: process.env.OPENAI_IMPORT_MODEL ?? "gpt-4o-mini",

      temperature: 0.1,

      response_format: { type: "json_object" },

      messages: [

        {

          role: "system",

          content:

            "Jesteś parserem zadań matematycznych. Zwracasz wyłącznie poprawny JSON.",

        },

        {

          role: "user",

          content: buildPrompt(rawText),

        },

      ],

    });



    const content = response.choices[0]?.message?.content;



    if (!content) {

      return null;

    }



    const parsed = JSON.parse(content) as {

      exercises?: AiExercisePayload[];

    };



    if (!Array.isArray(parsed.exercises)) {

      return null;

    }



    return parsed.exercises

      .map((item, index): RawExerciseBlock | null => {

        const text = (item.text ?? item.latex ?? "").trim();



        if (!text) {

          return null;

        }



        return {

          number: item.number?.trim() || String(index + 1),

          text,

          confidence: 0.92,

        };

      })

      .filter((item): item is RawExerciseBlock => item !== null);

  } catch (error) {

    console.error("AI parser failed:", error);

    return null;

  }

}



async function parseWithPazdroRules(

  rawText: string,

  ocrPages: OcrPageResult[]

): Promise<RawExerciseBlock[] | null> {

  if (!isPazdroTextbookText(rawText)) {

    return null;

  }



  const blocks = await detectPazdroExercises(rawText, ocrPages);



  if (blocks.length === 0) {

    return null;

  }



  return blocks.map((block) => ({

    number: block.number,

    text: block.text,

    confidence: block.confidence,

    level: block.level,

    levelDetected: block.levelDetected,

  }));

}



function summarizeMathReconstruction(exercises: ParsedExercise[]): {

  mathReconstructed: boolean;

  warnings: string[];

} {

  const reconstructed = exercises.filter(

    (exercise) => exercise.mathReconstructed

  ).length;



  if (reconstructed === 0) {

    return {

      mathReconstructed: false,

      warnings: [

        "Rekonstrukcja matematyki nie zmieniła treści — sprawdź zapis w edytorze.",

      ],

    };

  }



  const aiCount = exercises.filter(

    (exercise) => exercise.mathReconstructionMethod === "ai"

  ).length;



  return {

    mathReconstructed: true,

    warnings: [

      aiCount > 0

        ? `Zastosowano rekonstrukcję matematyki (AI) dla ${reconstructed} zadań.`

        : `Zastosowano rekonstrukcję matematyki (reguły) dla ${reconstructed} zadań.`,

    ],

  };

}



export async function parseExercisesWithAi(

  rawText: string,

  options?: {

    ocrPages?: OcrPageResult[];

    pazdroBlocks?: import("./pazdroParser").PazdroExerciseBlock[];

    reconstructMath?: boolean;

    fileName?: string;

    extractionMethod?: ExtractionMethod;

  }

): Promise<AiParseResult> {

  const warnings: string[] = [];

  const ocrPages = options?.ocrPages ?? [];

  const reconstructMath = options?.reconstructMath ?? false;

  const extractionMethod = options?.extractionMethod ?? "pdf-text";

  const allowCkeTextParser = shouldAllowCkeTextParserFallback(extractionMethod);



  if (options?.pazdroBlocks && options.pazdroBlocks.length > 0) {

    const undetectedLevels = options.pazdroBlocks.filter(

      (block) => !block.levelDetected

    ).length;



    if (undetectedLevels > 0) {

      warnings.push(

        `Nie wykryto poziomu (Podstawowy/Rozszerzony) dla ${undetectedLevels} zadań — potwierdź w podglądzie importu.`

      );

    }



    const exercises = await toExercises(

      options.pazdroBlocks.map((block) => ({

        number: block.number,

        text: block.text,

        confidence: block.confidence,

        level: block.level,

        levelDetected: block.levelDetected,

        tresc: block.tresc,

        odpowiedz: block.odpowiedz,

        rozwiazanie: block.rozwiazanie,

        identifikatorPp: block.identifikatorPp,

        identifikatorPr: block.identifikatorPr,

      })),

      { reconstructMath }

    );



    const mathSummary = reconstructMath

      ? summarizeMathReconstruction(exercises)

      : { mathReconstructed: false, warnings: [] };



    return {

      exercises,

      aiUsed: false,

      warnings: [...warnings, ...mathSummary.warnings],

      mathReconstructed: mathSummary.mathReconstructed,

    };

  }



  if (extractionMethod === "vision") {

    warnings.push(

      "Import CKE przez Vision — parser tekstowy (ckeTextParser) pominięty."

    );

  }



  const ckeBlocks = allowCkeTextParser

    ? parseCkeMaturaExercisesFromFile(rawText, options?.fileName)

    : [];



  if (ckeBlocks.length > 0) {

    warnings.push(

      `Wykryto arkusz maturalny CKE — użyto dedykowanego parsera tekstowego (${ckeBlocks.length} zadań).`

    );



    const exercises = await toExercises(ckeBlocks, { reconstructMath });

    const mathSummary = reconstructMath

      ? summarizeMathReconstruction(exercises)

      : { mathReconstructed: false, warnings: [] };



    return {

      exercises,

      aiUsed: false,

      warnings: [...warnings, ...mathSummary.warnings],

      mathReconstructed: mathSummary.mathReconstructed,

    };

  }



  const pazdroBlocks = await parseWithPazdroRules(rawText, ocrPages);



  if (pazdroBlocks && pazdroBlocks.length > 0) {

    const undetectedLevels = pazdroBlocks.filter(

      (block) => !block.levelDetected

    ).length;



    if (undetectedLevels > 0) {

      warnings.push(

        `Nie wykryto poziomu (Podstawowy/Rozszerzony) dla ${undetectedLevels} zadań — potwierdź w podglądzie importu.`

      );

    }



    const exercises = await toExercises(pazdroBlocks, { reconstructMath });

    const mathSummary = reconstructMath

      ? summarizeMathReconstruction(exercises)

      : { mathReconstructed: false, warnings: [] };



    return {

      exercises,

      aiUsed: false,

      warnings: [...warnings, ...mathSummary.warnings],

      mathReconstructed: mathSummary.mathReconstructed,

    };

  }



  if (extractionMethod === "vision") {
    warnings.push(
      "Vision nie zwróciło zadań — parser AI pominięty (CKE wymaga Vision, nie fallbacku tekstowego)."
    );

    return {
      exercises: [],
      aiUsed: false,
      warnings,
      mathReconstructed: false,
    };
  }

  const aiBlocks = await parseWithOpenAi(rawText);



  if (aiBlocks && aiBlocks.length > 0) {

    const exercises = await toExercises(aiBlocks, { reconstructMath });

    const mathSummary = reconstructMath

      ? summarizeMathReconstruction(exercises)

      : { mathReconstructed: false, warnings: [] };



    return {

      exercises,

      aiUsed: true,

      warnings: [...warnings, ...mathSummary.warnings],

      mathReconstructed: mathSummary.mathReconstructed,

    };

  }



  if (isOpenAiConfigured()) {

    warnings.push(

      "Parser AI nie zwrócił wyników — użyto parsera regułowego."

    );

  } else {

    warnings.push(

      "Brak klucza OPENAI_API_KEY — użyto parsera regułowego."

    );

  }



  const ruleBlocks = detectExercisesFromText(rawText);



  if (ruleBlocks.length === 0 && rawText.trim()) {

    warnings.push(

      "Nie wykryto osobnych zadań — utworzono jedno zadanie z całego tekstu."

    );



    const exercises = reconstructMath

      ? await toExercises(

          [

            {

              number: "1",

              text: rawText.trim(),

              confidence: 0.4,

            },

          ],

          { reconstructMath: true }

        )

      : [

          {

            index: 0,

            number: "1",

            rawText: rawText.trim(),

            confidence: 0.4,

            level: null,

            levelDetected: false,

            mathReconstructed: false,

            mathReconstructionMethod: null,

            tresc: textToEditorDocument(rawText, "import-fallback"),

            rozwiazanie: createEmptyDocument("sol-fallback"),

            odpowiedz: createEmptyDocument("ans-fallback"),

            selected: true,

            saved: false,

            savedTaskId: null,

            savedKod: null,

            poziom: null,

            punkty: null,

            czas: null,

          },

        ];



    const mathSummary = reconstructMath

      ? summarizeMathReconstruction(exercises)

      : { mathReconstructed: false, warnings: [] };



    return {

      exercises,

      aiUsed: false,

      warnings: [...warnings, ...mathSummary.warnings],

      mathReconstructed: mathSummary.mathReconstructed,

    };

  }



  const exercises = await toExercises(ruleBlocks, { reconstructMath });

  const mathSummary = reconstructMath

    ? summarizeMathReconstruction(exercises)

    : { mathReconstructed: false, warnings: [] };



  return {

    exercises,

    aiUsed: false,

    warnings: [...warnings, ...mathSummary.warnings],

    mathReconstructed: mathSummary.mathReconstructed,

  };

}


