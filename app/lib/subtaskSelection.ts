import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
} from "@/app/components/editor/types";

const SUBTASK_LABEL_PATTERN = /^([a-d])\)\s*/i;

export type SubtaskSelectionOptions = {
  selectedSubtasks?: string[] | null;
  renumberSelectedSubtasks?: boolean;
};

export function isSubtaskLabel(label: string): boolean {
  return /^[a-d]$/i.test(label.trim());
}

function normalizeSubtaskLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function extractParagraphSubtaskLabel(
  paragraph: Paragraph
): string | null {
  const first = paragraph.children[0];

  if (first?.type !== "text") {
    return null;
  }

  const match = first.text.match(SUBTASK_LABEL_PATTERN);

  return match ? normalizeSubtaskLabel(match[1]) : null;
}

export function detectSubtasks(value: unknown): string[] {
  const document = parseEditorDocument(value);

  if (!document) {
    return [];
  }

  const labels: string[] = [];

  for (const paragraph of document.paragraphs) {
    const label = extractParagraphSubtaskLabel(paragraph);

    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }

  return labels;
}

export function effectiveSelectedSubtasks(
  selectedSubtasks: string[] | null | undefined,
  allSubtasks: string[]
): string[] {
  if (!selectedSubtasks || selectedSubtasks.length === 0) {
    return allSubtasks;
  }

  const allowed = new Set(allSubtasks);

  return selectedSubtasks
    .map(normalizeSubtaskLabel)
    .filter((label) => allowed.has(label));
}

export function isFullSubtaskSelection(
  allSubtasks: string[],
  selectedSubtasks: string[]
): boolean {
  if (allSubtasks.length === 0) {
    return true;
  }

  if (selectedSubtasks.length !== allSubtasks.length) {
    return false;
  }

  const selected = new Set(selectedSubtasks.map(normalizeSubtaskLabel));

  return allSubtasks.every((label) => selected.has(label));
}

export function normalizeSubtaskSelectionForStorage(
  allSubtasks: string[],
  selectedSubtasks: string[]
): string[] | undefined {
  const normalized = selectedSubtasks.map(normalizeSubtaskLabel);

  if (isFullSubtaskSelection(allSubtasks, normalized)) {
    return undefined;
  }

  return normalized;
}

export function buildSubtaskRenumberMap(
  allSubtasks: string[],
  selectedSubtasks: string[],
  renumberSelectedSubtasks: boolean
): Map<string, string> | null {
  if (!renumberSelectedSubtasks) {
    return null;
  }

  if (isFullSubtaskSelection(allSubtasks, selectedSubtasks)) {
    return null;
  }

  const selectedSet = new Set(selectedSubtasks.map(normalizeSubtaskLabel));
  const selectedInOrder = allSubtasks.filter((label) =>
    selectedSet.has(label)
  );
  const map = new Map<string, string>();

  for (let index = 0; index < selectedInOrder.length; index += 1) {
    map.set(selectedInOrder[index], String.fromCharCode(97 + index));
  }

  return map;
}

function rewriteParagraphSubtaskLabel(
  paragraph: Paragraph,
  newLabel: string
): Paragraph {
  const first = paragraph.children[0];

  if (first?.type !== "text") {
    return paragraph;
  }

  const match = first.text.match(SUBTASK_LABEL_PATTERN);

  if (!match) {
    return paragraph;
  }

  const rest = first.text.slice(match[0].length);

  return {
    ...paragraph,
    children: [
      {
        ...first,
        text: `${newLabel}) ${rest}`,
      },
      ...paragraph.children.slice(1),
    ],
  };
}

function splitInlineAnswerSegments(
  children: InlineNode[]
): Map<string, InlineNode[]> {
  const segments = new Map<string, InlineNode[]>();
  let currentLabel: string | null = null;
  let currentNodes: InlineNode[] = [];

  function flush() {
    if (!currentLabel) {
      return;
    }

    if (currentNodes.length > 0) {
      segments.set(currentLabel, currentNodes);
    }

    currentNodes = [];
  }

  for (const node of children) {
    if (node.type === "text") {
      const labelMatch = node.text.match(SUBTASK_LABEL_PATTERN);

      if (labelMatch) {
        flush();
        currentLabel = normalizeSubtaskLabel(labelMatch[1]);
        const rest = node.text.slice(labelMatch[0].length);

        if (rest) {
          currentNodes.push({ ...node, text: rest });
        }

        continue;
      }

      if (/^\s+$/.test(node.text) && currentNodes.length === 0) {
        continue;
      }
    }

    if (currentLabel) {
      currentNodes.push(node);
    }
  }

  flush();

  return segments;
}

function hasInlineSubtaskAnswers(document: EditorDocument): boolean {
  return document.paragraphs.some((paragraph) => {
    return splitInlineAnswerSegments(paragraph.children).size > 0;
  });
}

function resolveFilterOptions(
  selectedSubtasks: string[] | null | undefined,
  renumberSelectedSubtasks = true
): Required<Pick<SubtaskSelectionOptions, "renumberSelectedSubtasks">> & {
  selectedSubtasks: string[] | null | undefined;
} {
  return {
    selectedSubtasks,
    renumberSelectedSubtasks,
  };
}

export function filterTaskDocumentBySubtasks(
  value: unknown,
  selectedSubtasks: string[] | null | undefined,
  renumberSelectedSubtasks = true
): unknown {
  const options = resolveFilterOptions(
    selectedSubtasks,
    renumberSelectedSubtasks
  );

  if (!options.selectedSubtasks || options.selectedSubtasks.length === 0) {
    return value;
  }

  const document = parseEditorDocument(value);

  if (!document) {
    return value;
  }

  const allSubtasks = detectSubtasks(document);

  if (allSubtasks.length === 0) {
    return value;
  }

  const selected = new Set(
    options.selectedSubtasks.map(normalizeSubtaskLabel)
  );

  if (isFullSubtaskSelection(allSubtasks, [...selected])) {
    return value;
  }

  const labelMap = buildSubtaskRenumberMap(
    allSubtasks,
    options.selectedSubtasks,
    options.renumberSelectedSubtasks
  );

  const filteredParagraphs = document.paragraphs
    .filter((paragraph) => {
      const label = extractParagraphSubtaskLabel(paragraph);

      if (!label) {
        return true;
      }

      return selected.has(label);
    })
    .map((paragraph) => {
      const label = extractParagraphSubtaskLabel(paragraph);

      if (!label || !labelMap) {
        return paragraph;
      }

      const displayLabel = labelMap.get(label);

      if (!displayLabel || displayLabel === label) {
        return paragraph;
      }

      return rewriteParagraphSubtaskLabel(paragraph, displayLabel);
    });

  return {
    ...document,
    paragraphs: filteredParagraphs,
  };
}

export function filterInlineAnswerBySubtasks(
  value: unknown,
  selectedSubtasks: string[] | null | undefined,
  renumberSelectedSubtasks = true
): unknown {
  const options = resolveFilterOptions(
    selectedSubtasks,
    renumberSelectedSubtasks
  );

  if (!options.selectedSubtasks || options.selectedSubtasks.length === 0) {
    return value;
  }

  const document = parseEditorDocument(value);

  if (!document || !hasInlineSubtaskAnswers(document)) {
    return value;
  }

  const allSubtasks = ["a", "b", "c", "d"].filter((label) => {
    return document.paragraphs.some((paragraph) =>
      splitInlineAnswerSegments(paragraph.children).has(label)
    );
  });

  const selected = new Set(
    options.selectedSubtasks.map(normalizeSubtaskLabel)
  );
  const orderedLabels = allSubtasks.filter((label) => selected.has(label));
  const labelMap = buildSubtaskRenumberMap(
    allSubtasks,
    options.selectedSubtasks,
    options.renumberSelectedSubtasks
  );

  const paragraphs = document.paragraphs.map((paragraph, paragraphIndex) => {
    const segments = splitInlineAnswerSegments(paragraph.children);

    if (segments.size === 0) {
      return paragraph;
    }

    const children: InlineNode[] = [];
    let nodeIndex = 0;

    for (const label of orderedLabels) {
      const segment = segments.get(label);

      if (!segment || segment.length === 0) {
        continue;
      }

      const displayLabel = labelMap?.get(label) ?? label;

      if (children.length > 0) {
        children.push({
          id: `subtask-gap-${paragraphIndex}-${nodeIndex++}`,
          type: "text",
          text: "    ",
        });
      }

      children.push({
        id: `subtask-label-${paragraphIndex}-${displayLabel}`,
        type: "text",
        text: `${displayLabel}) `,
      });
      children.push(...segment);
    }

    return {
      ...paragraph,
      children,
    };
  });

  return {
    ...document,
    paragraphs,
  };
}

export function filterVariantFieldBySubtasks(
  value: unknown,
  field: "tresc" | "odpowiedz" | "rozwiazanie",
  options: SubtaskSelectionOptions = {}
): unknown {
  const renumberSelectedSubtasks = options.renumberSelectedSubtasks ?? true;

  if (field === "tresc") {
    return filterTaskDocumentBySubtasks(
      value,
      options.selectedSubtasks,
      renumberSelectedSubtasks
    );
  }

  return filterInlineAnswerBySubtasks(
    value,
    options.selectedSubtasks,
    renumberSelectedSubtasks
  );
}
