import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
} from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

import { inlineContentToInlineNodes } from "./visionInlineMath";
import { visionValueToLatex } from "./visionNotationToLatex";
import { shouldRenderAsMath } from "./visionContentClassification";

export type MultipleChoiceOption = {
  label: string;
  text: string;
};

export type MultipleChoiceParseResult = {
  question: string;
  options: MultipleChoiceOption[];
  correctChoice: string | null;
};

const CHOICE_LINE_PATTERN = /^([A-D])[.)]\s*(.+)$/i;
const CHOICE_LABEL_ONLY_PATTERN = /^([A-D])[.)]?\s*$/i;
const CORRECT_CHOICE_PATTERN =
  /(?:poprawna\s+odpowied[źz]|odpowied[źz]\s+poprawna|klucz)[:\s]*([A-D])\b/i;

/** Spacing between CKE multiple-choice options on one line (matches exam layout). */
export const MC_OPTION_SEPARATOR = " ".repeat(24);

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
    return [];
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

export function isMultipleChoiceOptionLabel(label: string): boolean {
  return /^[A-D]$/i.test(label.trim());
}

export function formatMultipleChoiceLabel(label: string): string {
  return `${label.trim().toUpperCase()}.`;
}

export function detectMultipleChoiceInText(
  text: string
): MultipleChoiceParseResult | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const questionLines: string[] = [];
  const options: MultipleChoiceOption[] = [];
  let inChoices = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (!inChoices && questionLines.length > 0) {
        questionLines.push("");
      }
      continue;
    }

    const choiceMatch = trimmed.match(CHOICE_LINE_PATTERN);

    if (choiceMatch) {
      inChoices = true;
      options.push({
        label: choiceMatch[1].toUpperCase(),
        text: choiceMatch[2].trim(),
      });
      continue;
    }

    const labelOnlyMatch = trimmed.match(CHOICE_LABEL_ONLY_PATTERN);

    if (labelOnlyMatch) {
      inChoices = true;
      options.push({
        label: labelOnlyMatch[1].toUpperCase(),
        text: "",
      });
      continue;
    }

    if (!inChoices && /\b[A-D]\.\s+.+\b[A-D]\.\s+/i.test(trimmed)) {
      const inline = extractInlineMultipleChoiceOptions(trimmed);

      if (inline && inline.length >= 2) {
        const splitIndex = trimmed.search(/\b[A-D]\.\s+/);

        if (splitIndex > 0) {
          questionLines.push(trimmed.slice(0, splitIndex).trim());
        }

        options.push(...inline);
        break;
      }
    }

    if (inChoices) {
      const last = options.at(-1);

      if (last) {
        last.text = `${last.text} ${trimmed}`.trim();
      }
      continue;
    }

    questionLines.push(trimmed);
  }

  if (options.length < 2) {
    return null;
  }

  const labels = new Set(options.map((option) => option.label));

  if (labels.size !== options.length) {
    return null;
  }

  const correctMatch = text.match(CORRECT_CHOICE_PATTERN);

  return {
    question: questionLines.join("\n").trim(),
    options,
    correctChoice: correctMatch?.[1]?.toUpperCase() ?? null,
  };
}

/**
 * Parses inline CKE options on one line, e.g. "A. 1200 zł B. 1236 zł C. 1836 zł D. 3600 zł".
 */
export function extractInlineMultipleChoiceOptions(
  text: string
): MultipleChoiceOption[] | null {
  const normalized = text.replace(/\r\n/g, " ").trim();
  const matches = [...normalized.matchAll(/\b([A-D])\.\s+/gi)];

  if (matches.length < 2) {
    return null;
  }

  const options: MultipleChoiceOption[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const label = current[1].toUpperCase();
    const start = (current.index ?? 0) + current[0].length;
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index ?? normalized.length
        : normalized.length;
    const optionText = normalized.slice(start, end).trim();

    if (optionText) {
      options.push({ label, text: optionText });
    }
  }

  const labels = new Set(options.map((option) => option.label));

  return labels.size >= 2 ? options : null;
}

export function multipleChoiceOptionsToInlineNodes(
  options: MultipleChoiceOption[],
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const nodes: InlineNode[] = [];

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (index > 0) {
      nodes.push(
        createSeededTextNode(MC_OPTION_SEPARATOR, seed, nodeCounter.value++)
      );
    }

    nodes.push(
      createSeededTextNode(
        `${formatMultipleChoiceLabel(option.label)} `,
        seed,
        nodeCounter.value++
      )
    );
    nodes.push(...textToInlineNodes(option.text, seed, nodeCounter));
  }

  return nodes;
}

export function buildMultipleChoiceOptionsParagraph(
  options: MultipleChoiceOption[],
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number }
): Paragraph {
  return createParagraph(
    multipleChoiceOptionsToInlineNodes(options, seed, nodeCounter),
    seed,
    paragraphIndex
  );
}

export function formatMultipleChoiceOptionsInline(
  options: MultipleChoiceOption[]
): string {
  return options
    .map(
      (option) =>
        `${formatMultipleChoiceLabel(option.label)} ${option.text.trim()}`
    )
    .join(MC_OPTION_SEPARATOR);
}

export function buildMultipleChoiceDocument(
  question: string,
  options: MultipleChoiceOption[],
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

  if (options.length > 0) {
    paragraphs.push(
      buildMultipleChoiceOptionsParagraph(
        options,
        seed,
        paragraphIndex++,
        nodeCounter
      )
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

export function buildMultipleChoiceAnswerDocument(
  correctChoice: string | null,
  seed: string
): EditorDocument {
  if (!correctChoice?.trim()) {
    return createEmptyDocument(`${seed}-ans`);
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs: [
      createParagraph(
        [
          createSeededTextNode(
            correctChoice.trim().toUpperCase(),
            `${seed}-ans`,
            0
          ),
        ],
        `${seed}-ans`,
        0
      ),
    ],
  });
}

export function exerciseLooksLikeMultipleChoice(
  document: EditorDocument
): boolean {
  for (const paragraph of document.paragraphs) {
    const text = paragraph.children
      .map((node) => (node.type === "text" ? node.text : node.latex ?? ""))
      .join("");
    const inlineLabels = [
      ...text.matchAll(/\b([A-D])\.\s+/gi),
    ].map((match) => match[1].toUpperCase());

    if (
      inlineLabels.length >= 2 &&
      new Set(inlineLabels).size === inlineLabels.length
    ) {
      return true;
    }
  }

  const labels = document.paragraphs
    .map((paragraph) => {
      const first = paragraph.children.find((node) => node.type === "text");

      if (!first || first.type !== "text") {
        return null;
      }

      const match = first.text.trim().match(/^([A-D])\.$/i);
      return match?.[1]?.toUpperCase() ?? null;
    })
    .filter((label): label is string => Boolean(label));

  return labels.length >= 2 && new Set(labels).size === labels.length;
}
