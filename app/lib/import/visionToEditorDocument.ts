import {
  createEmptyDocument,
  createTextNode,
  ensureDocumentInlineEditing,
} from "@/app/components/editor/core/document";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
  TableNode,
} from "@/app/components/editor/types";
import { DOCUMENT_VERSION } from "@/app/components/editor/types";

import { isFillBlankExercise } from "./fillBlankDetect";
import {
  collectOrderedBodyBlocks,
  endsMidSentence,
  hasSubtaskLabelText,
  isEquationBodySegment,
  resolveSubtaskExpression,
  resolveSubtaskText,
  shouldMergeInlineBodySegments,
  startsContinuation,
  subtaskHasContent,
} from "./visionNormalize";
import {
  buildMultipleChoiceAnswerDocument,
  formatMultipleChoiceLabel,
  MC_OPTION_SEPARATOR,
  isMultipleChoiceOptionLabel,
} from "./multipleChoiceDetect";
import {
  buildTrueFalseAnswerDocument,
  isTrueFalseAnswerValue,
  type TrueFalseStatement,
  visionTableLooksLikeTrueFalse,
  visionTableToStatements,
} from "./trueFalseDetect";
import {
  buildMatchingAnswerDocument,
  buildMatchingTableParagraph,
  collectMatchingContent,
  isMatchingExercise,
} from "./matchingDetect";
import {
  visionExpressionToLatex,
  visionValueToLatex,
} from "./visionNotationToLatex";
import { inlineContentToInlineNodes } from "./visionInlineMath";
import { shouldRenderAsMath, looksLikeMeasurement } from "./visionContentClassification";

export type VisionEditorDocuments = {
  tresc: EditorDocument;
  odpowiedz: EditorDocument;
  rozwiazanie: EditorDocument;
};

function formatSubtaskLabel(label: string): string {
  const trimmed = label.trim();

  if (/^[a-z]$/i.test(trimmed)) {
    return `${trimmed})`;
  }

  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)$/i.test(trimmed)) {
    return `${trimmed}.`;
  }

  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}.`;
  }

  return trimmed.endsWith(")") || trimmed.endsWith(".")
    ? trimmed
    : `${trimmed})`;
}

function createSeededImageNode(
  src: string,
  width: number,
  height: number,
  alt: string,
  seed: string,
  index: number
) {
  return {
    id: `i-${seed}-${index}`,
    type: "image" as const,
    src,
    width,
    height,
    alt,
  };
}

function figuresForAnchor(
  exercise: VisionExercise,
  anchor: string
): VisionFigure[] {
  return (exercise.figures ?? []).filter((figure) => figure.anchor === anchor);
}

function tablesForAnchor(
  exercise: VisionExercise,
  anchor: string
): VisionTable[] {
  return (exercise.tables ?? []).filter((table) => table.anchor === anchor);
}

function figureToParagraph(
  figure: VisionFigure,
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number }
): Paragraph | null {
  if (!figure.src) {
    return null;
  }

  return createParagraph(
    [
      createSeededImageNode(
        figure.src,
        figure.width ?? 300,
        figure.height ?? 200,
        figure.alt ?? "",
        seed,
        nodeCounter.value++
      ),
    ],
    `${seed}-fig-${paragraphIndex}`,
    paragraphIndex
  );
}

function tableToParagraph(
  table: VisionTable,
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number },
  skipTrueFalse = false
): Paragraph | null {
  if (
    skipTrueFalse &&
    visionTableLooksLikeTrueFalse(table.headers, table.rows)
  ) {
    return null;
  }

  const rows = (table.rows ?? []).filter((row) => row.length > 0);

  if (rows.length === 0 && !table.textFallback?.trim()) {
    return null;
  }

  const tableNode: TableNode = {
    id: `tbl-${seed}-${nodeCounter.value++}`,
    type: "table",
    headers: table.headers?.length ? [...table.headers] : undefined,
    rows: rows.map((row) => [...row]),
  };

  return createParagraph([tableNode], `${seed}-tbl`, paragraphIndex);
}

function tableToParagraphs(
  table: VisionTable,
  seed: string,
  startIndex: number,
  nodeCounter: { value: number },
  skipTrueFalse = false
): Paragraph[] {
  const paragraph = tableToParagraph(
    table,
    seed,
    startIndex,
    nodeCounter,
    skipTrueFalse
  );

  return paragraph ? [paragraph] : [];
}

function appendAnchoredContent(
  paragraphs: Paragraph[],
  exercise: VisionExercise,
  anchor: string,
  seed: string,
  paragraphIndexRef: { value: number },
  nodeCounter: { value: number },
  skipTrueFalseTables = false
): void {
  for (const table of tablesForAnchor(exercise, anchor)) {
    const tableParagraphs = tableToParagraphs(
      table,
      seed,
      paragraphIndexRef.value,
      nodeCounter,
      skipTrueFalseTables
    );
    paragraphs.push(...tableParagraphs);
    paragraphIndexRef.value += tableParagraphs.length;
  }

  for (const figure of figuresForAnchor(exercise, anchor)) {
    const figureParagraph = figureToParagraph(
      figure,
      seed,
      paragraphIndexRef.value,
      nodeCounter
    );

    if (figureParagraph) {
      paragraphs.push(figureParagraph);
      paragraphIndexRef.value += 1;
    }
  }
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

function collectExerciseMathElements(exercise: VisionExercise): string[] {
  const elements = new Set<string>();

  for (const subtask of exercise.subtasks ?? []) {
    for (const element of subtask.mathElements ?? []) {
      const trimmed = element.trim();

      if (trimmed) {
        elements.add(trimmed);
      }
    }
  }

  for (const choice of exercise.choices ?? []) {
    for (const element of choice.mathElements ?? []) {
      const trimmed = element.trim();

      if (trimmed) {
        elements.add(trimmed);
      }
    }
  }

  return [...elements];
}

function resolveChoiceText(choice: VisionChoice): string {
  return choice.text?.trim() || choice.expression?.trim() || "";
}

function isMultipleChoiceExercise(exercise: VisionExercise): boolean {
  if (
    exercise.exerciseKind === "true_false" ||
    exercise.exerciseKind === "matching"
  ) {
    return false;
  }

  if (exercise.exerciseKind === "multiple_choice") {
    return true;
  }

  const choices = exercise.choices ?? [];

  return (
    choices.length >= 2 &&
    choices.every((choice) => isMultipleChoiceOptionLabel(choice.label))
  );
}

function isTrueFalseExercise(exercise: VisionExercise): boolean {
  if (exercise.exerciseKind === "true_false") {
    return true;
  }

  if (isMatchingExercise(exercise)) {
    return false;
  }

  const statements = collectTrueFalseStatements(exercise);

  return statements.length >= 1;
}

function resolveStatementText(statement: VisionTrueFalseStatement): string {
  return statement.text?.trim() || statement.expression?.trim() || "";
}

function collectTrueFalseStatements(
  exercise: VisionExercise
): TrueFalseStatement[] {
  const directStatements = (exercise.statements ?? [])
    .map((statement) => {
      const text = resolveStatementText(statement);

      if (!text) {
        return null;
      }

      return {
        label: statement.label?.trim() || undefined,
        text,
      };
    })
    .filter((statement): statement is TrueFalseStatement => Boolean(statement));

  if (directStatements.length > 0) {
    return directStatements;
  }

  for (const table of exercise.tables ?? []) {
    if (!visionTableLooksLikeTrueFalse(table.headers, table.rows)) {
      continue;
    }

    const fromTable = visionTableToStatements(table.headers, table.rows);

    if (fromTable.length > 0) {
      return fromTable;
    }
  }

  return [];
}

function buildMatchingTableParagraphFromExercise(
  exercise: VisionExercise,
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number }
): Paragraph | null {
  const { items, options } = collectMatchingContent(exercise);

  if (items.length === 0) {
    return null;
  }

  nodeCounter.value += 1;

  return buildMatchingTableParagraph(items, options, seed, paragraphIndex);
}

function buildTrueFalseTableParagraphFromExercise(
  exercise: VisionExercise,
  seed: string,
  paragraphIndex: number,
  nodeCounter: { value: number }
): Paragraph | null {
  const statements = collectTrueFalseStatements(exercise);

  if (statements.length === 0) {
    return null;
  }

  const sharedMathElements = collectExerciseMathElements(exercise);
  const rows = statements.map((statement, index) => ({
    id: `tfr-${seed}-${index}`,
    label: statement.label,
    statement: subtaskTextToInlineNodes(
      statement.text,
      [
        ...sharedMathElements,
        ...(exercise.statements?.[index]?.mathElements ?? []),
      ],
      `${seed}-pf-${index}`,
      nodeCounter
    ),
  }));

  return createParagraph(
    [
      {
        id: `tft-${seed}`,
        type: "true-false-table",
        layout: "cke-prawda-falsz",
        rows,
      },
    ],
    seed,
    paragraphIndex
  );
}

function instructionToInlineNodes(
  instruction: string,
  mathElements: string[],
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  return inlineContentToInlineNodes(
    instruction,
    mathElements,
    (value) => createSeededTextNode(value, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );
}

function paragraphPlainText(paragraph: Paragraph): string {
  return paragraph.children
    .filter((node) => node.type === "text")
    .map((node) => (node.type === "text" ? node.text : ""))
    .join("");
}

function isMathOnlyParagraph(paragraph: Paragraph): boolean {
  const inlineChildren = paragraph.children.filter(
    (node) => node.type === "text" || node.type === "math"
  );

  if (inlineChildren.length === 0) {
    return false;
  }

  if (inlineChildren.every((node) => node.type === "math")) {
    return true;
  }

  if (inlineChildren.length === 1 && inlineChildren[0].type === "text") {
    return isEquationBodySegment(inlineChildren[0].text);
  }

  return false;
}

function isMergeableInlineParagraph(paragraph: Paragraph): boolean {
  return paragraph.children.every(
    (node) => node.type === "text" || node.type === "math"
  );
}

function paragraphSegmentText(paragraph: Paragraph): string {
  if (isMathOnlyParagraph(paragraph)) {
    const mathNode = paragraph.children.find((node) => node.type === "math");

    return mathNode?.type === "math" ? mathNode.latex : "";
  }

  return paragraphPlainText(paragraph);
}

function paragraphEndsMidSentence(paragraph: Paragraph): boolean {
  const text = paragraphPlainText(paragraph);

  if (text && endsMidSentence(text)) {
    return true;
  }

  const lastInline = paragraph.children
    .filter((node) => node.type === "text" || node.type === "math")
    .at(-1);

  return lastInline?.type === "math";
}

function hasSubtaskLabelPrefix(paragraph: Paragraph): boolean {
  const firstText = paragraph.children.find((node) => node.type === "text");

  if (!firstText || firstText.type !== "text") {
    return false;
  }

  return hasSubtaskLabelText(firstText.text);
}

function shouldMergeParagraphPair(
  previous: Paragraph,
  next: Paragraph
): boolean {
  if (hasSubtaskLabelPrefix(next)) {
    return false;
  }

  const prevText = paragraphSegmentText(previous);
  const nextText = paragraphSegmentText(next);

  if (shouldMergeInlineBodySegments(prevText, nextText)) {
    return true;
  }

  if (paragraphEndsMidSentence(previous) && isMathOnlyParagraph(next)) {
    return true;
  }

  if (isMathOnlyParagraph(previous) && startsContinuation(nextText)) {
    return true;
  }

  return false;
}

function joinParagraphChildren(
  left: Paragraph,
  right: Paragraph,
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const children: InlineNode[] = [...left.children];
  const last = children.at(-1);
  const first = right.children[0];
  const needsSpace =
    last &&
    first &&
    !(
      last.type === "text" &&
      (last.text.endsWith(" ") || last.text.endsWith("\u00a0"))
    ) &&
    !(first.type === "text" && first.text.startsWith(" "));

  if (needsSpace) {
    children.push(createSeededTextNode(" ", seed, nodeCounter.value++));
  }

  children.push(...right.children);

  return children;
}

function mergeParagraphGroup(
  group: Paragraph[],
  seed: string,
  nodeCounter: { value: number }
): Paragraph {
  let children = group[0].children;

  for (let index = 1; index < group.length; index += 1) {
    children = joinParagraphChildren(
      { ...group[0], children },
      group[index],
      seed,
      nodeCounter
    );
  }

  return {
    ...group[0],
    children,
  };
}

/**
 * Coalesces adjacent paragraphs that were split by Vision Y-ordering but belong
 * to one inline sentence: Text → MathNode → Text.
 */
function mergeCoalescedInlineParagraphs(
  paragraphs: Paragraph[],
  seed: string,
  nodeCounter: { value: number }
): Paragraph[] {
  if (paragraphs.length <= 1) {
    return paragraphs;
  }

  const merged: Paragraph[] = [];
  let group: Paragraph[] = [];

  const flushGroup = () => {
    if (group.length === 0) {
      return;
    }

    merged.push(
      group.length === 1
        ? group[0]
        : mergeParagraphGroup(group, seed, nodeCounter)
    );
    group = [];
  };

  for (const paragraph of paragraphs) {
    if (!isMergeableInlineParagraph(paragraph)) {
      flushGroup();
      merged.push(paragraph);
      continue;
    }

    const previous = group.at(-1);

    if (previous && shouldMergeParagraphPair(previous, paragraph)) {
      group.push(paragraph);
      continue;
    }

    flushGroup();
    group.push(paragraph);
  }

  flushGroup();

  return merged;
}

function buildTaskDocument(
  exercise: VisionExercise,
  seed: string
): EditorDocument {
  const paragraphs: Paragraph[] = [];
  const nodeCounter = { value: 0 };
  const paragraphIndexRef = { value: 0 };

  const bodyBlocks = collectOrderedBodyBlocks(exercise);
  const sharedMathElements = collectExerciseMathElements(exercise);

  for (const block of bodyBlocks) {
    paragraphs.push(
      createParagraph(
        instructionToInlineNodes(
          block.text,
          sharedMathElements,
          seed,
          nodeCounter
        ),
        seed,
        paragraphIndexRef.value++
      )
    );

    if (block.field === "instruction") {
      appendAnchoredContent(
        paragraphs,
        exercise,
        "after_instruction",
        seed,
        paragraphIndexRef,
        nodeCounter,
        isTrueFalseExercise(exercise)
      );
    }
  }

  if (isMultipleChoiceExercise(exercise)) {
    appendAnchoredContent(
      paragraphs,
      exercise,
      "before_choices",
      seed,
      paragraphIndexRef,
      nodeCounter
    );

    // CKE closed tasks keep A/B/C/D on one line like the printed exam (default).
    const choicesLayout = exercise.choicesLayout ?? "inline";

    if (choicesLayout === "inline") {
      const inlineNodes: InlineNode[] = [];
      let choiceIndex = 0;

      for (const inlineChoice of exercise.choices ?? []) {
        const inlineText = resolveChoiceText(inlineChoice);

        if (!inlineText) {
          continue;
        }

        if (choiceIndex > 0) {
          inlineNodes.push(
            createSeededTextNode(MC_OPTION_SEPARATOR, seed, nodeCounter.value++)
          );
        }

        inlineNodes.push(
          createSeededTextNode(
            `${formatMultipleChoiceLabel(inlineChoice.label)} `,
            seed,
            nodeCounter.value++
          ),
          ...subtaskTextToInlineNodes(
            inlineText,
            [...sharedMathElements, ...(inlineChoice.mathElements ?? [])],
            seed,
            nodeCounter
          )
        );
        choiceIndex += 1;
      }

      if (inlineNodes.length > 0) {
        paragraphs.push(
          createParagraph(inlineNodes, seed, paragraphIndexRef.value++)
        );
      }
    } else {
      for (const choice of exercise.choices ?? []) {
        const choiceText = resolveChoiceText(choice);

        if (!choiceText) {
          continue;
        }

        paragraphs.push(
          createParagraph(
            [
              createSeededTextNode(
                `${formatMultipleChoiceLabel(choice.label)} `,
                seed,
                nodeCounter.value++
              ),
              ...subtaskTextToInlineNodes(
                choiceText,
                [...sharedMathElements, ...(choice.mathElements ?? [])],
                seed,
                nodeCounter
              ),
            ],
            seed,
            paragraphIndexRef.value++
          )
        );
      }
    }
  } else if (isMatchingExercise(exercise)) {
    appendAnchoredContent(
      paragraphs,
      exercise,
      "before_choices",
      seed,
      paragraphIndexRef,
      nodeCounter
    );

    const tableParagraph = buildMatchingTableParagraphFromExercise(
      exercise,
      seed,
      paragraphIndexRef.value,
      nodeCounter
    );

    if (tableParagraph) {
      paragraphs.push(tableParagraph);
      paragraphIndexRef.value += 1;
    }
  } else if (isTrueFalseExercise(exercise)) {
    appendAnchoredContent(
      paragraphs,
      exercise,
      "before_choices",
      seed,
      paragraphIndexRef,
      nodeCounter
    );

    const tableParagraph = buildTrueFalseTableParagraphFromExercise(
      exercise,
      seed,
      paragraphIndexRef.value,
      nodeCounter
    );

    if (tableParagraph) {
      paragraphs.push(tableParagraph);
      paragraphIndexRef.value += 1;
    }
  } else for (const subtask of exercise.subtasks ?? []) {
    const expression = resolveSubtaskExpression(subtask);
    const text = resolveSubtaskText(subtask);

    if (!subtaskHasContent(subtask)) {
      continue;
    }

    paragraphs.push(
      createParagraph(
        [
          createSeededTextNode(
            `${formatSubtaskLabel(subtask.label)} `,
            seed,
            nodeCounter.value++
          ),
          ...(text
            ? subtaskTextToInlineNodes(
                text,
                [
                  ...sharedMathElements,
                  ...(subtask.mathElements ?? []),
                ],
                seed,
                nodeCounter
              )
            : subtaskExpressionToInlineNodes(
                expression,
                seed,
                nodeCounter
              )),
        ],
        seed,
        paragraphIndexRef.value++
      )
    );

    appendAnchoredContent(
      paragraphs,
      exercise,
      `after_subtask:${subtask.label}`,
      seed,
      paragraphIndexRef,
      nodeCounter
    );
  }

  appendAnchoredContent(
    paragraphs,
    exercise,
    "end",
    seed,
    paragraphIndexRef,
    nodeCounter
  );

  const coalescedParagraphs = mergeCoalescedInlineParagraphs(
    paragraphs,
    seed,
    nodeCounter
  );

  if (coalescedParagraphs.length === 0) {
    return ensureDocumentInlineEditing({
      version: DOCUMENT_VERSION,
      paragraphs: [
        createParagraph([createTextNode("")], seed, paragraphIndexRef.value),
      ],
    });
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs: coalescedParagraphs,
  });
}

function isSubanswerLabel(label: string): boolean {
  return /^[a-d]$/i.test(label.trim());
}

export function normalizeVisionAnswers(exercise: VisionExercise): VisionAnswer[] {
  const normalized: VisionAnswer[] = [];

  for (const item of exercise.answers ?? []) {
    const value = item.value?.trim() ?? "";
    const label = item.label?.trim() ?? "";

    if (value) {
      normalized.push({ label, value });
      continue;
    }

    if (label && !isSubanswerLabel(label)) {
      normalized.push({ label: "", value: label });
    }
  }

  if (normalized.length === 0 && exercise.answer?.trim()) {
    normalized.push({ label: "", value: exercise.answer.trim() });
  }

  return normalized;
}

function subtaskTextToInlineNodes(
  text: string,
  mathElements: string[],
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  return inlineContentToInlineNodes(
    text,
    mathElements,
    (value) => createSeededTextNode(value, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );
}

function subtaskExpressionToInlineNodes(
  expression: string,
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const trimmed = expression.trim();

  if (!trimmed) {
    return [];
  }

  return inlineContentToInlineNodes(
    trimmed,
    [],
    (value) => createSeededTextNode(value, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );
}

export function answerValueToInlineNodes(
  value: string,
  seed: string,
  nodeCounter: { value: number }
): InlineNode[] {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  if (looksLikeMeasurement(trimmed)) {
    return [
      createSeededTextNode(trimmed, seed, nodeCounter.value++),
    ];
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

  const inlineNodes = inlineContentToInlineNodes(
    trimmed,
    [],
    (text) => createSeededTextNode(text, seed, nodeCounter.value++),
    (latex) => createSeededMathNode(latex, seed, nodeCounter.value++)
  );

  if (inlineNodes.some((node) => node.type === "math")) {
    return inlineNodes;
  }

  const numberWithSuffix = trimmed.match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/);

  if (numberWithSuffix) {
    const [, numericPart, suffix] = numberWithSuffix;
    const nodes: InlineNode[] = [];

    if (numericPart && shouldRenderAsMath(numericPart)) {
      nodes.push(
        createSeededMathNode(
          visionValueToLatex(numericPart),
          seed,
          nodeCounter.value++
        )
      );
    } else if (numericPart) {
      nodes.push(
        createSeededTextNode(numericPart, seed, nodeCounter.value++)
      );
    }

    if (suffix?.trim()) {
      nodes.push(
        createSeededTextNode(
          suffix.startsWith(" ") ? suffix : ` ${suffix}`,
          seed,
          nodeCounter.value++
        )
      );
    }

    if (nodes.length > 0) {
      return nodes;
    }
  }

  return [createSeededTextNode(trimmed, seed, nodeCounter.value++)];
}

function buildAnswerDocument(
  exercise: VisionExercise,
  seed: string
): EditorDocument {
  if (isMultipleChoiceExercise(exercise)) {
    const correctChoice =
      exercise.correctChoice?.trim().toUpperCase() ||
      normalizeVisionAnswers(exercise).find((answer) =>
        isMultipleChoiceOptionLabel(answer.value.trim())
      )?.value.trim().toUpperCase() ||
      null;

    return buildMultipleChoiceAnswerDocument(correctChoice, seed);
  }

  if (isMatchingExercise(exercise)) {
    const answers = normalizeVisionAnswers(exercise)
      .map((answer) => {
        const label = answer.label?.trim();
        const value = answer.value.trim().toUpperCase();

        if (label && value) {
          return `${label}:${value}`;
        }

        return value;
      })
      .filter(Boolean);

    return buildMatchingAnswerDocument(answers, seed);
  }

  if (isTrueFalseExercise(exercise)) {
    const answers = normalizeVisionAnswers(exercise)
      .map((answer) => answer.value.trim().toUpperCase())
      .filter(isTrueFalseAnswerValue);

    return buildTrueFalseAnswerDocument(answers, seed);
  }

  const answers = normalizeVisionAnswers(exercise).filter(
    (answer) => answer.value.trim().length > 0
  );

  if (answers.length === 0) {
    return createEmptyDocument(seed);
  }

  const children: InlineNode[] = [];
  const nodeCounter = { value: 0 };
  const multiSubanswer =
    answers.length > 1 ||
    answers.some((answer) => isSubanswerLabel(answer.label));

  for (const [index, answer] of answers.entries()) {
    if (index > 0) {
      children.push(createSeededTextNode("    ", seed, nodeCounter.value++));
    }

    if (multiSubanswer && isSubanswerLabel(answer.label)) {
      children.push(
        createSeededTextNode(
          `${formatSubtaskLabel(answer.label)} `,
          seed,
          nodeCounter.value++
        )
      );
    }

    children.push(
      ...answerValueToInlineNodes(answer.value, seed, nodeCounter)
    );
  }

  return ensureDocumentInlineEditing({
    version: DOCUMENT_VERSION,
    paragraphs: [createParagraph(children, `${seed}-ans`, 0)],
  });
}

/**
 * Builds task content, answer, and solution documents from Vision exercise JSON.
 * Textbook answers go to odpowiedz and rozwiazanie — not tresc.
 */
export function visionExerciseToEditorDocuments(
  exercise: VisionExercise,
  seed = "vision"
): VisionEditorDocuments {
  return {
    tresc: buildTaskDocument(exercise, seed),
    odpowiedz: buildAnswerDocument(exercise, `${seed}-ans`),
    rozwiazanie: buildAnswerDocument(exercise, `${seed}-sol`),
  };
}

export function visionExerciseSuggestedTyp(
  exercise: VisionExercise
): "wybor-wielokrotny" | "prawda-falsz" | "dopasuj" | "uzupelnij" | null {
  if (isMatchingExercise(exercise)) {
    return "dopasuj";
  }

  if (isTrueFalseExercise(exercise)) {
    return "prawda-falsz";
  }

  if (isFillBlankExercise(exercise)) {
    return "uzupelnij";
  }

  return isMultipleChoiceExercise(exercise) ? "wybor-wielokrotny" : null;
}

/** @deprecated Use visionExerciseToEditorDocuments for full import mapping. */
export function visionExerciseToEditorDocument(
  exercise: VisionExercise,
  seed = "vision"
): EditorDocument {
  return visionExerciseToEditorDocuments(exercise, seed).tresc;
}

export function countMathNodes(document: EditorDocument): number {
  return document.paragraphs.reduce(
    (count, paragraph) =>
      count + paragraph.children.filter((node) => node.type === "math").length,
    0
  );
}

export function documentHasMathNodes(document: EditorDocument): boolean {
  return countMathNodes(document) > 0;
}

export function countImageNodes(document: EditorDocument): number {
  return document.paragraphs.reduce(
    (count, paragraph) =>
      count + paragraph.children.filter((node) => node.type === "image").length,
    0
  );
}

export function documentHasImageNodes(document: EditorDocument): boolean {
  return countImageNodes(document) > 0;
}
