import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
  TrueFalseTableNode,
  TrueFalseTableRow,
} from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

import { inlineContentToInlineNodes } from "./visionInlineMath";
import { visionValueToLatex } from "./visionNotationToLatex";
import { shouldRenderAsMath } from "./visionContentClassification";

export type TrueFalseStatement = {
  label?: string;
  text: string;
};

export type TrueFalseParseResult = {
  question: string;
  statements: TrueFalseStatement[];
  answers: string[];
};

const PF_INSTRUCTION_PATTERN =
  /\bwybierz\s+P,\s*jeśli\s+stwierdzenie\s+jest\s+prawdziwe/i;
const PF_HEADER_PATTERN =
  /stwierdzenie/i;
const PF_COLUMN_PATTERN = /\bP\s+F\b/i;
const STATEMENT_LINE_PATTERN = /^(\d+)[.)]\s+(.+)$/;
const CORRECT_PF_PATTERN =
  /(?:poprawna\s+odpowied[źz]|odpowied[źz]\s+poprawna|klucz)[:\s]*([PF,\s]+)/i;

function createSeededTextNode(text: string, seed: string, index: number) {
  return {
    id: `t-${seed}-${index}`,
    type: "text" as const,
    text,
  };
}

function createSeededMathNode(latex: string, seed: string, index: number) {
  return {
    id: `m-${seed}-${index}`,
    type: "math" as const,
    latex,
  };
}

function createParagraph(
  children: InlineNode[],
  seed: string,
  index: number
): Paragraph {
  return {
    id: `p-${seed}-${index}`,
    children,
  };
}

function textToInlineNodes(
  text: string,
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [createSeededTextNode("", seed, nodeCounter.value++)];
  }

  if (shouldRenderAsMath(trimmed)) {
    return [
      createSeededMathNode(
        visionValueToLatex(trimmed),
        seed,
        nodeCounter.value++
      ),
    ];
  }

  return inlineContentToInlineNodes(
    trimmed,
    [],
    (value) => createSeededTextNode(value, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );
}

export function isTrueFalseIndicator(text: string): boolean {
  return (
    PF_INSTRUCTION_PATTERN.test(text) ||
    PF_COLUMN_PATTERN.test(text) ||
    (PF_HEADER_PATTERN.test(text) &&
      /\bP\b/.test(text) &&
      /\bF\b/.test(text))
  );
}

export function isTrueFalseAnswerValue(value: string): boolean {
  return /^[PF]$/i.test(value.trim());
}

export function parseTrueFalseAnswers(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => part === "P" || part === "F");
}

function isHeaderLine(line: string): boolean {
  return (
    (PF_HEADER_PATTERN.test(line) &&
      /\bP\b/.test(line) &&
      /\bF\b/.test(line)) ||
    /^\s*P\s+F\s*$/i.test(line)
  );
}

export function detectTrueFalseInText(
  text: string
): TrueFalseParseResult | null {
  const normalized = text.replace(/\r\n/g, "\n");

  if (!isTrueFalseIndicator(normalized)) {
    return null;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const questionLines: string[] = [];
  const statementLines: string[] = [];
  let inStatements = false;

  for (const line of lines) {
    if (isHeaderLine(line)) {
      inStatements = true;
      continue;
    }

    const statementMatch = line.match(STATEMENT_LINE_PATTERN);

    if (statementMatch) {
      inStatements = true;
      statementLines.push(line);
      continue;
    }

    if (inStatements && statementLines.length > 0) {
      const lastIndex = statementLines.length - 1;
      statementLines[lastIndex] = `${statementLines[lastIndex]} ${line}`.trim();
      continue;
    }

    if (!inStatements) {
      questionLines.push(line);
    }
  }

  const statements: TrueFalseStatement[] = statementLines
    .map((line) => {
      const match = line.match(STATEMENT_LINE_PATTERN);

      if (!match) {
        return null;
      }

      return {
        label: match[1],
        text: match[2].trim(),
      };
    })
    .filter((statement): statement is TrueFalseStatement => Boolean(statement));

  if (statements.length === 0) {
    return null;
  }

  const correctMatch = normalized.match(CORRECT_PF_PATTERN);
  const answers = correctMatch?.[1]
    ? parseTrueFalseAnswers(correctMatch[1])
    : [];

  return {
    question: questionLines.join("\n").trim(),
    statements,
    answers,
  };
}

export function buildTrueFalseTableNode(
  statements: TrueFalseStatement[],
  seed: string
): TrueFalseTableNode {
  const nodeCounter = { value: 0 };

  const rows: TrueFalseTableRow[] = statements.map((statement, index) => ({
    id: `tfr-${seed}-${index}`,
    label: statement.label,
    statement: textToInlineNodes(
      statement.text,
      `${seed}-r${index}`,
      nodeCounter
    ),
  }));

  return {
    id: `tft-${seed}`,
    type: "true-false-table",
    layout: "cke-prawda-falsz",
    rows,
  };
}

export function buildTrueFalseTableParagraph(
  statements: TrueFalseStatement[],
  seed: string,
  paragraphIndex: number
): Paragraph {
  return createParagraph(
    [buildTrueFalseTableNode(statements, seed)],
    seed,
    paragraphIndex
  );
}

export function buildTrueFalseDocument(
  question: string,
  statements: TrueFalseStatement[],
  seed: string
): EditorDocument {
  const paragraphs: Paragraph[] = [];
  const nodeCounter = { value: 0 };
  let paragraphIndex = 0;

  if (question.trim()) {
    paragraphs.push(
      createParagraph(
        textToInlineNodes(question, seed, nodeCounter),
        seed,
        paragraphIndex++
      )
    );
  }

  if (statements.length > 0) {
    paragraphs.push(
      buildTrueFalseTableParagraph(statements, seed, paragraphIndex++)
    );
  }

  if (paragraphs.length === 0) {
    return createEmptyDocument(seed);
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs,
  });
}

export function buildTrueFalseAnswerDocument(
  answers: string[],
  seed: string
): EditorDocument {
  if (answers.length === 0) {
    return createEmptyDocument(`${seed}-ans`);
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs: [
      createParagraph(
        answers.map((answer, index) =>
          createSeededTextNode(
            index === 0 ? answer : `, ${answer}`,
            `${seed}-ans`,
            index
          )
        ),
        `${seed}-ans`,
        0
      ),
    ],
  });
}

export function isTrueFalseTableNode(
  node: InlineNode
): node is TrueFalseTableNode {
  return node.type === "true-false-table";
}

export function documentHasTrueFalseTable(
  document: EditorDocument
): boolean {
  return document.paragraphs.some((paragraph) =>
    paragraph.children.some(isTrueFalseTableNode)
  );
}

export function visionTableLooksLikeTrueFalse(
  headers: string[] | undefined,
  rows: string[][] | undefined
): boolean {
  const headerText = (headers ?? []).join(" ");

  if (
    PF_HEADER_PATTERN.test(headerText) &&
    /\bP\b/.test(headerText) &&
    /\bF\b/.test(headerText)
  ) {
    return true;
  }

  if (!rows?.length) {
    return false;
  }

  const pfHeaderRow = rows[0];

  if (!pfHeaderRow?.length) {
    return false;
  }

  const firstRowText = pfHeaderRow.join(" ");

  return (
    PF_HEADER_PATTERN.test(firstRowText) &&
    /\bP\b/.test(firstRowText) &&
    /\bF\b/.test(firstRowText)
  );
}

export function formatTrueFalseStatementsInline(
  statements: TrueFalseStatement[]
): string {
  const rows = statements.map((statement) => {
    const prefix = statement.label ? `${statement.label}. ` : "";
    return `${prefix}${statement.text.trim()}`;
  });

  return ["Stwierdzenie\tP\tF", ...rows].join("\n");
}

export function visionTableToStatements(
  headers: string[] | undefined,
  rows: string[][] | undefined
): TrueFalseStatement[] {
  if (!rows?.length) {
    return [];
  }

  let dataRows = rows;

  if (
    !headers?.length &&
    dataRows[0] &&
    PF_HEADER_PATTERN.test(dataRows[0].join(" "))
  ) {
    dataRows = dataRows.slice(1);
  }

  return dataRows
    .map((row, index) => {
      const statementText = row[0]?.trim() ?? "";

      if (!statementText) {
        return null;
      }

      if (
        PF_HEADER_PATTERN.test(statementText) &&
        /\bP\b/.test(statementText) &&
        /\bF\b/.test(statementText)
      ) {
        return null;
      }

      const numbered = statementText.match(/^(\d+)[.)]\s+(.+)$/);

      return {
        label: numbered?.[1] ?? String(index + 1),
        text: numbered?.[2]?.trim() ?? statementText,
      };
    })
    .filter((statement): statement is TrueFalseStatement => Boolean(statement));
}
