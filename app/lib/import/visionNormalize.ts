import { inferVisionExerciseKind, isFillBlankExercise } from "./fillBlankDetect";
import { isCkeStyleIdentifier } from "./maturaParser";
import {
  hasMathSignals,
  looksLikePlainTextFragment,
  shouldRenderAsMath,
} from "./visionContentClassification";

export type VisionExerciseIdentifiers = {
  sourceIdentifierBasic?: string | null;
  sourceIdentifierExtended?: string | null;
};

export type PazdroIdentifierPair = {
  identifikatorPp: string | null;
  identifikatorPr: string | null;
};

export function tokenizePazdroIdentifierField(
  field: string | null | undefined
): string[] {
  const trimmed = field?.trim() ?? "";

  if (!trimmed) {
    return [];
  }

  const dotted = trimmed.match(/\d+\.\d+/g) ?? [];
  const remainder = trimmed.replace(/\d+\.\d+/g, " ");
  const bare = remainder.match(/\b\d+\b/g) ?? [];

  if (dotted.length > 0 || bare.length > 0) {
    return [...dotted, ...bare];
  }

  return [trimmed];
}

/**
 * Two identifiers (e.g. "1.171 1.188"): PP = first, PR = second.
 * One identifier (e.g. "1.20" or "20"): same value in both PP and PR.
 */
export function parsePazdroIdentifierField(
  identifier: string | null | undefined
): PazdroIdentifierPair {
  const tokens = tokenizePazdroIdentifierField(identifier);

  if (tokens.length === 0) {
    return { identifikatorPp: null, identifikatorPr: null };
  }

  if (tokens.length >= 2) {
    return {
      identifikatorPp: tokens[0],
      identifikatorPr: tokens[1],
    };
  }

  return {
    identifikatorPp: tokens[0],
    identifikatorPr: tokens[0],
  };
}

export function resolvePazdroIdentifiers(
  identifier: string | null | undefined,
  pp: string | null | undefined,
  pr: string | null | undefined
): PazdroIdentifierPair {
  const explicitPp = pp?.trim() || null;
  const explicitPr = pr?.trim() || null;

  if (explicitPp && explicitPr) {
    return {
      identifikatorPp: explicitPp,
      identifikatorPr: explicitPr,
    };
  }

  if (explicitPp) {
    return {
      identifikatorPp: explicitPp,
      identifikatorPr: explicitPp,
    };
  }

  if (explicitPr) {
    return {
      identifikatorPp: explicitPr,
      identifikatorPr: explicitPr,
    };
  }

  return parsePazdroIdentifierField(identifier);
}

export function formatPazdroIdentifierPreviewLines(
  pair: PazdroIdentifierPair
): string[] {
  const pp = pair.identifikatorPp?.trim();
  const pr = pair.identifikatorPr?.trim();

  if (!pp && !pr) {
    return [];
  }

  return [`PP: ${pp || "—"}`, `PR: ${pr || "—"}`];
}

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

export function resolveSubtaskText(subtask: VisionSubtask): string {
  return subtask.text?.trim() ?? "";
}

export function resolveSubtaskExpression(subtask: VisionSubtask): string {
  const expression = subtask.expression?.trim() ?? "";

  if (expression) {
    return expression;
  }

  if (resolveSubtaskText(subtask)) {
    return "";
  }

  const elements = (subtask.mathElements ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  if (elements.length === 0) {
    return "";
  }

  if (elements.length === 1) {
    return elements[0];
  }

  return elements.join(" · ");
}

export function subtaskHasContent(subtask: VisionSubtask): boolean {
  return Boolean(resolveSubtaskExpression(subtask) || resolveSubtaskText(subtask));
}

export function formatSubtaskPlainContent(subtask: VisionSubtask): string {
  const expression = resolveSubtaskExpression(subtask);

  if (expression) {
    return expression;
  }

  return resolveSubtaskText(subtask);
}

function paragraphAlreadyPresent(paragraphs: string[], candidate: string): boolean {
  const normalized = candidate.trim();

  if (!normalized) {
    return true;
  }

  return paragraphs.some(
    (paragraph) =>
      paragraph.trim() === normalized ||
      paragraph.includes(normalized) ||
      normalized.includes(paragraph)
  );
}

function splitBodyParagraphBlocks(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function endsMidSentence(text: string): boolean {
  const trimmed = text.trimEnd();

  if (!trimmed) {
    return false;
  }

  return !/[.!?;:]$/.test(trimmed);
}

export function startsContinuation(text: string): boolean {
  const trimmed = text.trimStart();

  return /^[a-ząćęłńóśźż(]/.test(trimmed);
}

export function hasSubtaskLabelText(text: string): boolean {
  return /^(?:[a-d]\)|[IVX]+\.|\d+\.)\s/i.test(text.trimStart());
}

export function isEquationBodySegment(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  if (shouldRenderAsMath(trimmed)) {
    return true;
  }

  return hasMathSignals(trimmed) && !looksLikePlainTextFragment(trimmed);
}

/**
 * Merges Y-sorted Vision fragments that belong to one inline sentence, e.g.
 * "Rozwiązaniem równania" + "2x+3=0" + "jest liczba".
 */
export function shouldMergeInlineBodySegments(
  previous: string,
  next: string
): boolean {
  const prev = previous.trimEnd();
  const following = next.trimStart();

  if (!prev || !following) {
    return false;
  }

  if (hasSubtaskLabelText(following)) {
    return false;
  }

  if (isEquationBodySegment(following) && endsMidSentence(prev)) {
    return true;
  }

  if (isEquationBodySegment(prev) && startsContinuation(following)) {
    return true;
  }

  if (endsMidSentence(prev) && startsContinuation(following)) {
    return true;
  }

  return false;
}

export function mergeInlineBodySegments(segments: string[]): string[] {
  const cleaned = segments.map((segment) => segment.trim()).filter(Boolean);

  if (cleaned.length <= 1) {
    return cleaned;
  }

  const merged: string[] = [];
  let buffer = cleaned[0];

  for (let index = 1; index < cleaned.length; index += 1) {
    const next = cleaned[index];

    if (shouldMergeInlineBodySegments(buffer, next)) {
      buffer = `${buffer.trimEnd()} ${next.trimStart()}`;
      continue;
    }

    merged.push(buffer);
    buffer = next;
  }

  merged.push(buffer);

  return merged;
}

function resolveNonOverlappingBodyFields(
  exercise: Pick<VisionExercise, "context" | "instruction" | "question">
): {
  context?: string;
  instruction?: string;
  question?: string;
} {
  const context = exercise.context?.trim() || undefined;
  const instruction = exercise.instruction?.trim() || undefined;
  const question = exercise.question?.trim() || undefined;

  if (context && instruction) {
    if (instruction.includes(context)) {
      return { instruction, question };
    }

    if (context.includes(instruction)) {
      return { context, question };
    }
  }

  return { context, instruction, question };
}

function appendBodyFieldSegments(
  segments: string[],
  value: string | undefined
): void {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  if (paragraphAlreadyPresent(segments, trimmed)) {
    return;
  }

  segments.push(...mergeInlineBodySegments(splitBodyParagraphBlocks(trimmed)));
}

function dedupeBodyBlocks(blocks: string[]): string[] {
  const result: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();

    if (!trimmed) {
      continue;
    }

    if (!paragraphAlreadyPresent(result, trimmed)) {
      result.push(trimmed);
    }
  }

  return result;
}

function shouldOmitCkeHeadingBlock(
  text: string,
  identifier: string | undefined
): boolean {
  if (!identifier?.trim() || !isCkeHeadingBlock(text)) {
    return false;
  }

  const parent = identifier.trim().match(/^(\d{1,2})/)?.[1];

  if (!parent) {
    return false;
  }

  return new RegExp(`^Zadanie\\s+${parent}(?:\\.|\\s|\\()`, "i").test(
    text.trim()
  );
}

/**
 * Ordered body paragraphs between task heading and subtasks/choices.
 * Supports explicit context/instruction/question fields and legacy single-field instruction.
 */
export function collectExerciseBodyParagraphs(
  exercise: Pick<VisionExercise, "context" | "instruction" | "question">
): string[] {
  const fields = resolveNonOverlappingBodyFields(exercise);
  const rawSegments: string[] = [];

  appendBodyFieldSegments(rawSegments, fields.context);

  const instruction = fields.instruction?.trim();

  if (instruction && !paragraphAlreadyPresent(rawSegments, instruction)) {
    appendBodyFieldSegments(rawSegments, instruction);
  }

  const question = fields.question?.trim();

  if (question && !paragraphAlreadyPresent(rawSegments, question)) {
    appendBodyFieldSegments(rawSegments, question);
  }

  const mergedSegments = rawSegments;

  const paragraphs: string[] = [];

  for (const segment of mergedSegments) {
    for (const part of splitBodyParagraphBlocks(segment)) {
      if (part && !paragraphAlreadyPresent(paragraphs, part)) {
        paragraphs.push(part);
      }
    }
  }

  return paragraphs;
}

export type BodyParagraphField = "context" | "instruction" | "question" | "body";

export type BodyParagraphGroup = {
  field: BodyParagraphField;
  paragraphs: string[];
};

export type OrderedBodyBlock = {
  text: string;
  field?: BodyParagraphField;
};

const CKE_HEADING_PATTERN = /^Zadanie\s+\d+/i;
const CONTEXT_START_PATTERN = /^Na\s+rysunku\b/i;
const GEOMETRY_CONTEXT_START_PATTERN = /^Dany jest\b/i;
const QUESTION_CLOSING_PATTERN = /^(Zapisz|Wpisz)\b/i;
const MC_INSTRUCTION_CLOSE_PATTERN = /spośród podanych\.\s*/i;
const INSTRUCTION_START_PATTERN =
  /^(Dokończ|Wybierz|Uzupełnij|Zaznacz|Oceń|Oblicz|Wyznacz|Wykaż|Udowodnij|Rozwiąż|Podaj|Określ|Zapisz|Wpisz|Dopasuj|Odczytaj)\b/i;
const INSTRUCTION_INLINE_PATTERN =
  /\b(Dokończ|Wybierz|Uzupełnij|Zaznacz|Oceń|Oblicz|Wyznacz|Wykaż|Udowodnij|Rozwiąż|Podaj|Określ|Zapisz|Wpisz|Dopasuj|Odczytaj)\b/i;

function normalizeFieldMatchText(value: string): string {
  return value
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function textMatchesField(block: string, field: string | undefined): boolean {
  const normalizedBlock = normalizeFieldMatchText(block);
  const normalizedField = normalizeFieldMatchText(field ?? "");

  if (!normalizedField || !normalizedBlock) {
    return false;
  }

  return (
    normalizedBlock.includes(normalizedField) ||
    normalizedField.includes(normalizedBlock)
  );
}

function isCkeHeadingBlock(text: string): boolean {
  return CKE_HEADING_PATTERN.test(text.trim());
}

function looksLikeContextBlock(text: string): boolean {
  const trimmed = text.trim();

  return (
    CONTEXT_START_PATTERN.test(trimmed) ||
    GEOMETRY_CONTEXT_START_PATTERN.test(trimmed)
  );
}

function splitGeometryContextPrefix(text: string): string[] {
  const trimmed = text.trim();

  if (!GEOMETRY_CONTEXT_START_PATTERN.test(trimmed)) {
    return [trimmed];
  }

  const instructionStart = trimmed.search(INSTRUCTION_INLINE_PATTERN);

  if (instructionStart <= 0) {
    return [trimmed];
  }

  const context = trimmed.slice(0, instructionStart).trim();
  const rest = trimmed.slice(instructionStart).trim();

  if (!context || !rest) {
    return [trimmed];
  }

  return [context, rest];
}

function splitMcInstructionFromQuestion(
  text: string,
  hasChoices: boolean
): string[] {
  const trimmed = text.trim();

  if (!trimmed || !hasChoices || !looksLikeInstructionBlock(trimmed)) {
    return [trimmed];
  }

  const closeMatch = trimmed.match(MC_INSTRUCTION_CLOSE_PATTERN);

  if (!closeMatch || closeMatch.index === undefined) {
    return [trimmed];
  }

  const splitIndex = closeMatch.index + closeMatch[0].length;
  const instruction = trimmed.slice(0, splitIndex).trim();
  const question = trimmed.slice(splitIndex).trim();

  if (!question || looksLikeInstructionBlock(question)) {
    return [trimmed];
  }

  return [instruction, question];
}

function expandMergedBodyBlock(
  text: string,
  hasChoices: boolean
): string[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  const expanded: string[] = [];

  for (const segment of splitGeometryContextPrefix(trimmed)) {
    expanded.push(...splitMcInstructionFromQuestion(segment, hasChoices));
  }

  return expanded.filter(Boolean);
}

function preprocessBodyBlocks(
  blocks: string[],
  exercise: Pick<VisionExercise, "choices">
): string[] {
  const hasChoices = (exercise.choices?.length ?? 0) >= 2;

  return blocks.flatMap((block) => expandMergedBodyBlock(block, hasChoices));
}

function looksLikeInstructionBlock(text: string): boolean {
  const trimmed = text.trim();

  return (
    INSTRUCTION_START_PATTERN.test(trimmed) && !looksLikeContextBlock(trimmed)
  );
}

function looksLikeQuestionClosingBlock(text: string): boolean {
  return QUESTION_CLOSING_PATTERN.test(text.trim());
}

/**
 * When Vision returns bodyBlocks (preservation-first), infer context/instruction/question
 * so figure anchors like after_instruction still land in the correct position.
 */
export function inferBodyBlockFields(
  blocks: string[],
  exercise: Pick<
    VisionExercise,
    "context" | "instruction" | "question" | "choices" | "exerciseKind"
  >
): BodyParagraphField[] {
  const fields: BodyParagraphField[] = blocks.map(() => "body");

  for (let index = 0; index < blocks.length; index += 1) {
    const text = blocks[index];

    if (textMatchesField(text, exercise.instruction)) {
      fields[index] = "instruction";
      continue;
    }

    if (textMatchesField(text, exercise.question)) {
      fields[index] = "question";
      continue;
    }

    if (textMatchesField(text, exercise.context)) {
      fields[index] = "context";
    }
  }

  if (!fields.includes("context")) {
    const contextIndex = blocks.findIndex((block) =>
      looksLikeContextBlock(block)
    );

    if (contextIndex >= 0) {
      fields[contextIndex] = "context";
    }
  }

  if (!fields.includes("instruction")) {
    const instructionIndex = blocks.findIndex(
      (block, index) =>
        looksLikeInstructionBlock(block) && fields[index] !== "context"
    );

    if (instructionIndex >= 0) {
      fields[instructionIndex] = "instruction";
    }
  }

  const hasChoices = (exercise.choices?.length ?? 0) >= 2;
  const hasSubtasks = (exercise.subtasks ?? []).some(subtaskHasContent);

  if (!fields.includes("question") && hasChoices) {
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      if (fields[index] !== "body" || isCkeHeadingBlock(blocks[index])) {
        continue;
      }

      fields[index] = "question";
      break;
    }
  }

  if (!fields.includes("question") && hasSubtasks) {
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      if (fields[index] !== "body" || isCkeHeadingBlock(blocks[index])) {
        continue;
      }

      if (looksLikeQuestionClosingBlock(blocks[index])) {
        fields[index] = "question";
        break;
      }
    }
  }

  const instructionIndex = fields.indexOf("instruction");

  if (instructionIndex > 0) {
    for (let index = 0; index < instructionIndex; index += 1) {
      if (fields[index] === "body" && !isCkeHeadingBlock(blocks[index])) {
        fields[index] = "context";
      }
    }
  }

  return fields;
}

/**
 * Body content in PDF reading order. Uses bodyBlocks when Vision provides them;
 * otherwise emits context → instruction → question without cross-field merging.
 */
export function collectOrderedBodyBlocks(
  exercise: Pick<
    VisionExercise,
    | "bodyBlocks"
    | "context"
    | "instruction"
    | "question"
    | "choices"
    | "exerciseKind"
    | "identifier"
  >
): OrderedBodyBlock[] {
  const explicitBlocks = mergeInlineBodySegments(
    dedupeBodyBlocks(
      preprocessBodyBlocks(
        (exercise.bodyBlocks ?? [])
          .map((block) => block.trim())
          .filter(Boolean),
        exercise
      )
    )
  ).filter(
    (block) => !shouldOmitCkeHeadingBlock(block, exercise.identifier)
  );

  if (explicitBlocks.length > 0) {
    const inferredFields = inferBodyBlockFields(explicitBlocks, exercise);

    return explicitBlocks.map((text, index) => ({
      text,
      field: inferredFields[index] ?? "body",
    }));
  }

  const groups = collectExerciseBodyParagraphGroups(exercise);

  return groups.flatMap((group) =>
    group.paragraphs.map((text) => ({
      text,
      field: group.field,
    }))
  );
}

function fieldTextToParagraphs(
  value: string | undefined,
  hasChoices = false
): string[] {
  const trimmed = value?.trim();

  if (!trimmed) {
    return [];
  }

  const paragraphs: string[] = [];

  for (const expanded of expandMergedBodyBlock(trimmed, hasChoices)) {
    for (const segment of mergeInlineBodySegments(
      splitBodyParagraphBlocks(expanded)
    )) {
      for (const part of splitBodyParagraphBlocks(segment)) {
        if (part) {
          paragraphs.push(part);
        }
      }
    }
  }

  return paragraphs;
}

/**
 * Body paragraphs grouped by source field so anchored content (e.g. figures
 * with after_instruction) can be inserted between instruction and question.
 */
export function collectExerciseBodyParagraphGroups(
  exercise: Pick<VisionExercise, "context" | "instruction" | "question" | "choices">
): BodyParagraphGroup[] {
  const fields = resolveNonOverlappingBodyFields(exercise);
  const groups: BodyParagraphGroup[] = [];
  const hasChoices = (exercise.choices?.length ?? 0) >= 2;

  const contextParagraphs = fieldTextToParagraphs(fields.context, hasChoices);

  if (contextParagraphs.length > 0) {
    groups.push({ field: "context", paragraphs: contextParagraphs });
  }

  const existingBeforeInstruction = groups.flatMap((group) => group.paragraphs);
  let instructionSplit = fieldTextToParagraphs(
    fields.instruction,
    hasChoices
  ).filter(
    (paragraph) => !paragraphAlreadyPresent(existingBeforeInstruction, paragraph)
  );

  if (
    !fields.context?.trim() &&
    instructionSplit.length >= 2 &&
    GEOMETRY_CONTEXT_START_PATTERN.test(instructionSplit[0])
  ) {
    groups.push({
      field: "context",
      paragraphs: [instructionSplit[0]],
    });
    instructionSplit = instructionSplit.slice(1);
  }

  let instructionParagraphs = instructionSplit;
  let peeledQuestionParagraphs: string[] = [];

  if (
    hasChoices &&
    instructionSplit.length >= 2 &&
    !fields.question?.trim()
  ) {
    const lastParagraph = instructionSplit[instructionSplit.length - 1];

    if (lastParagraph && !looksLikeInstructionBlock(lastParagraph)) {
      instructionParagraphs = instructionSplit.slice(0, -1);
      peeledQuestionParagraphs = [lastParagraph];
    }
  }

  if (instructionParagraphs.length > 0) {
    groups.push({ field: "instruction", paragraphs: instructionParagraphs });
  }

  const question = fields.question?.trim();
  const questionParagraphs = [
    ...peeledQuestionParagraphs,
    ...(question
      ? fieldTextToParagraphs(question, hasChoices).filter(
          (paragraph) =>
            !paragraphAlreadyPresent(
              [
                ...groups.flatMap((group) => group.paragraphs),
                ...peeledQuestionParagraphs,
              ],
              paragraph
            )
        )
      : []),
  ];

  if (questionParagraphs.length > 0) {
    groups.push({
      field: "question",
      paragraphs: questionParagraphs,
    });
  }

  return groups;
}

function applyPazdroIdentifiers(
  exercise: VisionExercise,
  pair: PazdroIdentifierPair
): VisionExercise & VisionExerciseIdentifiers {
  return {
    ...exercise,
    sourceIdentifierBasic: pair.identifikatorPp,
    sourceIdentifierExtended: pair.identifikatorPr,
  };
}

export function normalizeVisionExercise(
  exercise: VisionExercise
): VisionExercise & VisionExerciseIdentifiers {
  const normalizedSubtasks = (exercise.subtasks ?? []).map((subtask) => ({
    ...subtask,
    expression: subtask.expression?.trim() ?? "",
    text: subtask.text?.trim() || undefined,
  }));

  const hasBodyBlocks = (exercise.bodyBlocks ?? []).some((block) =>
    Boolean(block.trim())
  );

  const normalized: VisionExercise = {
    ...exercise,
    bodyBlocks: hasBodyBlocks
      ? dedupeBodyBlocks(
          (exercise.bodyBlocks ?? [])
            .map((block) => block.trim())
            .filter(Boolean)
        )
      : undefined,
    context: hasBodyBlocks
      ? undefined
      : exercise.context?.trim() || undefined,
    instruction: hasBodyBlocks
      ? ""
      : exercise.instruction?.trim() ?? "",
    question: hasBodyBlocks
      ? undefined
      : exercise.question?.trim() || undefined,
    subtasks: normalizedSubtasks,
    exerciseKind: inferVisionExerciseKind({
      ...exercise,
      subtasks: normalizedSubtasks,
    }),
  };

  const existingPp = exercise.sourceIdentifierBasic;
  const existingPr = exercise.sourceIdentifierExtended;

  if (isCkeStyleIdentifier(exercise.identifier)) {
    return {
      ...normalized,
      sourceIdentifierBasic: null,
      sourceIdentifierExtended: null,
    };
  }

  const pair = resolvePazdroIdentifiers(
    exercise.identifier,
    existingPp,
    existingPr
  );

  return applyPazdroIdentifiers(normalized, pair);
}

function instructionMergeKey(exercise: VisionExercise): string {
  return exercise.instruction?.trim().replace(/\s+/g, " ") ?? "";
}

function exerciseContentKey(
  exercise: VisionExercise & VisionExerciseIdentifiers
): string {
  const lines: string[] = [];

  for (const paragraph of collectExerciseBodyParagraphs(exercise)) {
    lines.push(paragraph);
  }

  for (const subtask of exercise.subtasks ?? []) {
    const content = formatSubtaskPlainContent(subtask);

    if (!content) {
      continue;
    }

    lines.push(`${formatSubtaskLabel(subtask.label)} ${content}`);
  }

  return lines.join("\n").trim();
}

function countResolvedSubtasks(exercise: VisionExercise): number {
  return (exercise.subtasks ?? []).filter((subtask) =>
    subtaskHasContent(subtask)
  ).length;
}

function pickPrimaryExercise(
  exercises: VisionExercise[]
): VisionExercise {
  return [...exercises].sort((left, right) => {
    const leftSubtasks = countResolvedSubtasks(left);
    const rightSubtasks = countResolvedSubtasks(right);

    if (leftSubtasks !== rightSubtasks) {
      return rightSubtasks - leftSubtasks;
    }

    const leftAnswers = left.answers?.length ?? 0;
    const rightAnswers = right.answers?.length ?? 0;

    return rightAnswers - leftAnswers;
  })[0];
}

function primaryPazdroNumber(identifier: string | undefined): string | null {
  const tokens = tokenizePazdroIdentifierField(identifier);

  return tokens[0] ?? null;
}

function mergeDualProfileExercise(
  basic: VisionExercise,
  extended: VisionExercise
): VisionExercise & VisionExerciseIdentifiers {
  const primary = pickPrimaryExercise([basic, extended]);
  const pp = primaryPazdroNumber(basic.identifier);
  const pr = primaryPazdroNumber(extended.identifier);

  return applyPazdroIdentifiers(
    {
      ...primary,
      identifier:
        pp && pr ? `${pp} ${pr}` : pr || pp || primary.identifier,
      level: extended.level ?? basic.level ?? primary.level,
      answers:
        (primary.answers?.length ?? 0) > 0
          ? primary.answers
          : extended.answers?.length
            ? extended.answers
            : basic.answers,
    },
    {
      identifikatorPp: pp,
      identifikatorPr: pr,
    }
  );
}

function collectSortedPazdroNumbers(
  exercises: VisionExercise[]
): string[] {
  const numbers = new Set<string>();

  for (const exercise of exercises) {
    for (const number of tokenizePazdroIdentifierField(exercise.identifier)) {
      numbers.add(number);
    }
  }

  return [...numbers].sort((left, right) => left.localeCompare(right, "pl"));
}

function pickAnswersSource(exercises: VisionExercise[]): VisionExercise {
  return [...exercises].sort((left, right) => {
    const leftAnswers = left.answers?.length ?? 0;
    const rightAnswers = right.answers?.length ?? 0;

    return rightAnswers - leftAnswers;
  })[0];
}

function mergeSameInstructionExercises(
  group: Array<VisionExercise & VisionExerciseIdentifiers>
): VisionExercise & VisionExerciseIdentifiers {
  const primary = pickPrimaryExercise(group);
  const subtasksSource =
    group.find((exercise) => countResolvedSubtasks(exercise) > 0) ?? primary;
  const answersSource = pickAnswersSource(group);
  const numbers = collectSortedPazdroNumbers(group);
  const pp =
    numbers.length >= 2
      ? numbers[0]
      : numbers.length === 1
        ? numbers[0]
        : null;
  const pr =
    numbers.length >= 2
      ? numbers[1]
      : numbers.length === 1
        ? numbers[0]
        : null;

  return applyPazdroIdentifiers(
    {
      ...primary,
      subtasks: subtasksSource.subtasks ?? [],
      identifier:
        pp && pr ? `${pp} ${pr}` : pr || pp || primary.identifier,
      level:
        group.find((exercise) => exercise.level === "extended")?.level ??
        group.find((exercise) => exercise.level === "basic")?.level ??
        primary.level,
      answers:
        (answersSource.answers?.length ?? 0) > 0
          ? answersSource.answers
          : primary.answers,
    },
    {
      identifikatorPp: pp,
      identifikatorPr: pr,
    }
  );
}

function tryMergeInstructionGroup(
  group: Array<VisionExercise & VisionExerciseIdentifiers>
): (VisionExercise & VisionExerciseIdentifiers) | null {
  if (group.length < 2) {
    return null;
  }

  const basic = group.find((exercise) => exercise.level === "basic");
  const extended = group.find((exercise) => exercise.level === "extended");

  if (basic && extended) {
    return mergeDualProfileExercise(basic, extended);
  }

  return mergeSameInstructionExercises(group);
}

export function mergePazdroDualVisionExercises(
  exercises: VisionExercise[]
): Array<VisionExercise & VisionExerciseIdentifiers> {
  const normalized = exercises.map(normalizeVisionExercise);
  const mergedIndices = new Set<number>();
  const result: Array<VisionExercise & VisionExerciseIdentifiers> = [];

  const byInstruction = new Map<
    string,
    Array<VisionExercise & VisionExerciseIdentifiers>
  >();

  for (const exercise of normalized) {
    const key = instructionMergeKey(exercise);

    if (!key) {
      continue;
    }

    const list = byInstruction.get(key) ?? [];
    list.push(exercise);
    byInstruction.set(key, list);
  }

  for (const group of byInstruction.values()) {
    if (group.length < 2) {
      continue;
    }

    const merged = tryMergeInstructionGroup(group);

    if (!merged) {
      continue;
    }

    result.push(merged);

    for (const exercise of group) {
      const index = normalized.indexOf(exercise);

      if (index >= 0) {
        mergedIndices.add(index);
      }
    }
  }

  const contentGroups = new Map<
    string,
    Array<VisionExercise & VisionExerciseIdentifiers>
  >();

  for (let index = 0; index < normalized.length; index += 1) {
    if (mergedIndices.has(index)) {
      continue;
    }

    const exercise = normalized[index];
    const key =
      exerciseContentKey(exercise) || `__id__:${exercise.identifier ?? index}`;
    const list = contentGroups.get(key) ?? [];
    list.push(exercise);
    contentGroups.set(key, list);
  }

  for (const group of contentGroups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const merged = tryMergeInstructionGroup(group);

    if (merged) {
      result.push(merged);
      continue;
    }

    result.push(pickPrimaryExercise(group));
  }

  return result;
}

export function formatPazdroIdentifierPreview(
  exercise: Pick<
    VisionExerciseIdentifiers,
    "sourceIdentifierBasic" | "sourceIdentifierExtended"
  >
): string[] {
  return formatPazdroIdentifierPreviewLines({
    identifikatorPp: exercise.sourceIdentifierBasic ?? null,
    identifikatorPr: exercise.sourceIdentifierExtended ?? null,
  });
}
