import {
  createEmptyDocument,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type {
  EditorDocument,
  InlineNode,
  MatchingTableNode,
  MatchingTableRow,
  Paragraph,
} from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

import type {
  VisionExercise,
  VisionMatchingItem,
  VisionMatchingOption,
  VisionTable,
} from "./visionExtract";
import { inlineContentToInlineNodes } from "./visionInlineMath";
import { visionValueToLatex } from "./visionNotationToLatex";
import { shouldRenderAsMath } from "./visionContentClassification";

export type MatchingItem = {
  label?: string;
  text: string;
};

export type MatchingOption = {
  label: string;
  text: string;
};

const MATCHING_INSTRUCTION_PATTERN = /\bDopasuj\b/i;
const MATCHING_OPTION_LABEL_PATTERN = /^[A-D]$/i;
const MATCHING_ITEM_LABEL_PATTERN = /^\d+$/;

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

export function isMatchingIndicator(text: string): boolean {
  return MATCHING_INSTRUCTION_PATTERN.test(text);
}

export function isMatchingOptionLabel(label: string): boolean {
  return MATCHING_OPTION_LABEL_PATTERN.test(label.trim());
}

function resolveMatchingItemText(item: VisionMatchingItem): string {
  return item.text?.trim() || item.expression?.trim() || "";
}

function resolveMatchingOptionText(option: VisionMatchingOption): string {
  return option.text?.trim() || option.expression?.trim() || "";
}

export function visionTableLooksLikeMatching(
  headers: string[] | undefined,
  rows: string[][] | undefined
): boolean {
  if (!rows?.length) {
    return false;
  }

  const headerText = (headers ?? []).join(" ");
  const numberedRows = rows.filter((row) => {
    const firstCell = row[0]?.trim() ?? "";
    return MATCHING_ITEM_LABEL_PATTERN.test(firstCell.split(/[.)]/)[0] ?? "");
  });

  if (numberedRows.length >= 2) {
    return true;
  }

  return (
    /\b(zdanie|własność|odpowiedź)\b/i.test(headerText) &&
    rows.length >= 2
  );
}

export function visionTableToMatching(
  headers: string[] | undefined,
  rows: string[][] | undefined
): { items: MatchingItem[]; options: MatchingOption[] } | null {
  if (!rows?.length) {
    return null;
  }

  const options: MatchingOption[] = [];
  const items: MatchingItem[] = [];

  for (const header of headers ?? []) {
    const match = header.trim().match(/^([A-D])[.)]?\s*(.+)$/i);

    if (match) {
      options.push({
        label: match[1].toUpperCase(),
        text: match[2].trim(),
      });
    }
  }

  for (const row of rows) {
    const firstCell = row[0]?.trim() ?? "";

    if (!firstCell) {
      continue;
    }

    const itemMatch = firstCell.match(/^(\d+)[.)]\s*(.+)$/);

    if (itemMatch) {
      items.push({
        label: itemMatch[1],
        text: itemMatch[2].trim(),
      });
      continue;
    }

    if (row.length >= 2 && firstCell) {
      items.push({
        label: String(items.length + 1),
        text: firstCell,
      });
    }
  }

  if (items.length < 2) {
    return null;
  }

  return { items, options };
}

export function collectMatchingContent(
  exercise: VisionExercise
): { items: MatchingItem[]; options: MatchingOption[] } {
  const directItems = (exercise.matchingItems ?? [])
    .map((item) => {
      const text = resolveMatchingItemText(item);

      if (!text) {
        return null;
      }

      return {
        label: item.label?.trim() || undefined,
        text,
      };
    })
    .filter((item): item is MatchingItem => Boolean(item));

  const directOptions = (exercise.matchingOptions ?? [])
    .map((option) => {
      const text = resolveMatchingOptionText(option);
      const label = option.label?.trim().toUpperCase() ?? "";

      if (!text || !isMatchingOptionLabel(label)) {
        return null;
      }

      return { label, text };
    })
    .filter((option): option is MatchingOption => Boolean(option));

  if (directItems.length >= 2) {
    return {
      items: directItems,
      options: directOptions,
    };
  }

  const allowsTableParsing =
    exercise.exerciseKind === "matching" ||
    isMatchingIndicator(exercise.instruction ?? "") ||
    (exercise.bodyBlocks ?? []).some((block) => isMatchingIndicator(block));

  if (!allowsTableParsing) {
    return { items: [], options: directOptions };
  }

  for (const table of exercise.tables ?? []) {
    if (!visionTableLooksLikeMatching(table.headers, table.rows)) {
      continue;
    }

    const parsed = visionTableToMatching(table.headers, table.rows);

    if (parsed && parsed.items.length >= 2) {
      return parsed;
    }
  }

  return { items: [], options: directOptions };
}

export function buildMatchingTableNode(
  items: MatchingItem[],
  options: MatchingOption[],
  seed: string
): MatchingTableNode {
  const nodeCounter = { value: 0 };

  const rows: MatchingTableRow[] = items.map((item, index) => ({
    id: `mr-${seed}-${index}`,
    label: item.label,
    left: textToInlineNodes(item.text, `${seed}-r${index}`, nodeCounter),
  }));

  return {
    id: `mt-${seed}`,
    type: "matching-table",
    layout: "cke-dopasuj",
    options: options.map((option) => ({
      label: option.label,
      text: option.text,
    })),
    rows,
  };
}

export function buildMatchingTableParagraph(
  items: MatchingItem[],
  options: MatchingOption[],
  seed: string,
  paragraphIndex: number
): Paragraph {
  return createParagraph(
    [buildMatchingTableNode(items, options, seed)],
    seed,
    paragraphIndex
  );
}

export function buildMatchingAnswerDocument(
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

export function isMatchingExercise(exercise: VisionExercise): boolean {
  if (exercise.exerciseKind === "matching") {
    return true;
  }

  const hasMatchingInstruction =
    isMatchingIndicator(exercise.instruction ?? "") ||
    (exercise.bodyBlocks ?? []).some((block) => isMatchingIndicator(block));

  if (!hasMatchingInstruction && (exercise.matchingItems?.length ?? 0) === 0) {
    return false;
  }

  const content = collectMatchingContent(exercise);

  return content.items.length >= 2;
}

export function isMatchingTableNode(
  node: InlineNode
): node is MatchingTableNode {
  return node.type === "matching-table";
}
