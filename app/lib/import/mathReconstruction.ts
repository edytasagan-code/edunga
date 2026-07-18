export type MathReconstructionMethod = "ai" | "rules" | "passthrough";

export type MathReconstructionResult = {
  text: string;
  method: MathReconstructionMethod;
  confidence: number;
};

function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function normalizeOcrArtifacts(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[Żż]/g, "/")
    .replace(/[–—]/g, "-")
    .replace(/[·⋅]/g, " * ")
    .replace(/\bV(\d+)\b/g, "\\sqrt{$1}")
    .replace(/(\d),(\d)/g, "$1.$2");
}

function replaceStackedFractionLines(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index] ?? "";
    const next = lines[index + 1] ?? "";

    const headerMatch = current.match(
      /^(\s*[a-d]\)\s*)?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(.*)$/i
    );
    const denominatorMatch = next.match(
      /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/
    );

    if (headerMatch && denominatorMatch) {
      const prefix = headerMatch[1] ?? "";
      const tail = headerMatch[4] ?? "";
      const fractionA = `\\frac{${headerMatch[2]}}{${denominatorMatch[1]}}`;
      const fractionB = `\\frac{${headerMatch[3]}}{${denominatorMatch[2]}}`;
      output.push(
        `${prefix}$${fractionA} \\cdot ${fractionB}$${tail}`.trim()
      );
      index += 1;
      continue;
    }

    const singleStackMatch = current.match(
      /^(\s*[a-d]\)\s*)?(\d+(?:\.\d+)?)\s*$/i
    );
    const singleDenominatorMatch = next.match(/^(\d+(?:\.\d+)?)\s*$/);

    if (singleStackMatch && singleDenominatorMatch) {
      const prefix = singleStackMatch[1] ?? "";
      output.push(
        `${prefix}$\\frac{${singleStackMatch[2]}}{${singleDenominatorMatch[1]}}$`
      );
      index += 1;
      continue;
    }

    output.push(current);
  }

  return output.join("\n");
}

function wrapColonDivision(text: string): string {
  return text.replace(
    /(\d+)\s*:\s*(\d+(?:\/\d+)?(?:\.\d+)?)/g,
    (_, left, right) => `$${left} \\div ${right}$`
  );
}

function wrapSimpleFractions(text: string): string {
  return text.replace(
    /(^|[^\w$])(\d+)\s*\/\s*(\d+)(?!\w)/g,
    (_, prefix, numerator, denominator) =>
      `${prefix}$\\frac{${numerator}}{${denominator}}$`
  );
}

function wrapArithmeticRuns(text: string): string {
  return text.replace(
    /(\(?-?\d+(?:\.\d+)?\)?(?:\s*\\frac\{\d+\}\{\d+\}|\s*\\sqrt\{\d+\})*(?:\s*[-+*/]\s*\(?-?\d+(?:\.\d+)?\)?(?:\s*\\frac\{\d+\}\{\d+\}|\s*\\sqrt\{\d+\})*)+)/g,
    (expression) => {
      if (expression.includes("$")) {
        return expression;
      }

      const normalized = expression
        .replace(/\s+/g, " ")
        .replace(/\*/g, " \\cdot ")
        .replace(/\s*-\s*/g, " - ")
        .replace(/\s*\+\s*/g, " + ")
        .trim();

      if (!/[\d\\+\-]/.test(normalized)) {
        return expression;
      }

      return `$${normalized}$`;
    }
  );
}

function mergeAdjacentMathSegments(text: string): string {
  return text.replace(/\$\s*\$/g, " ");
}

export function reconstructMathWithRules(
  rawText: string
): MathReconstructionResult {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      text: trimmed,
      method: "passthrough",
      confidence: 1,
    };
  }

  let text = normalizeOcrArtifacts(trimmed);
  text = replaceStackedFractionLines(text);
  text = wrapColonDivision(text);
  text = wrapSimpleFractions(text);
  text = wrapArithmeticRuns(text);
  text = mergeAdjacentMathSegments(text);

  const changed = text !== trimmed;

  return {
    text,
    method: changed ? "rules" : "passthrough",
    confidence: changed ? 0.72 : 0.55,
  };
}

async function reconstructMathWithAi(
  rawText: string
): Promise<MathReconstructionResult | null> {
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
          content: [
            "Jesteś silnikiem rekonstrukcji matematyki po OCR z polskich zbiorów zadań.",
            "Zwróć JSON: {\"text\":\"...\"}",
            "Zachowaj polski tekst słowny.",
            "Wyrażenia matematyczne zapisz jako LaTeX w $...$.",
            "Ułamki: \\frac{a}{b}, mnożenie: \\cdot, dzielenie: \\div.",
            "Pierwiastki: \\sqrt{n}. W LaTeX używaj przecinka dziesiętnego jako {,}.",
            "Nie dodawaj rozwiązań. Zachowaj oznaczenia a) b) c) d).",
          ].join("\n"),
        },
        {
          role: "user",
          content: rawText.slice(0, 6000),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as { text?: string };
    const text = parsed.text?.trim();

    if (!text) {
      return null;
    }

    return {
      text,
      method: "ai",
      confidence: 0.9,
    };
  } catch (error) {
    console.error("Math reconstruction AI failed:", error);
    return null;
  }
}

export async function reconstructExerciseMath(
  rawText: string,
  options?: {
    preferAi?: boolean;
  }
): Promise<MathReconstructionResult> {
  const preferAi = options?.preferAi ?? true;
  const preprocessed = reconstructMathWithRules(rawText);

  if (preferAi && isOpenAiConfigured()) {
    const aiResult = await reconstructMathWithAi(rawText);

    if (aiResult) {
      return aiResult;
    }
  }

  return preprocessed;
}

export async function reconstructMathInTexts(
  texts: string[],
  options?: {
    preferAi?: boolean;
  }
): Promise<MathReconstructionResult[]> {
  const results: MathReconstructionResult[] = [];

  for (const text of texts) {
    results.push(await reconstructExerciseMath(text, options));
  }

  return results;
}
