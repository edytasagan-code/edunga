import type {
  AnswerAreaHeight,
  AnswerAreaItemType,
  AnswerAreaType,
  DocumentAnswerAreaItem,
} from "./documentGenerator";
import {
  ANSWER_AREA_MAX_HEIGHT_PX,
  ANSWER_AREA_MIN_HEIGHT_PX,
  ANSWER_HEIGHT_PT,
  ANSWER_HEIGHT_PX,
  CM_TO_PT,
  FULL_PAGE_ANSWER_HEIGHT_PT,
  FULL_PAGE_ANSWER_HEIGHT_PX,
  GRID_STEP_PT,
  GRID_STEP_PX,
  LINE_STEP_PT,
  LINE_STEP_PX,
  resolveAnswerAreaItemHeightPx,
} from "./documentGenerator";

const PX_TO_PT = (2 * CM_TO_PT) / ANSWER_HEIGHT_PX["2cm"];

export function clampAnswerAreaHeightPx(heightPx: number): number {
  return Math.max(
    ANSWER_AREA_MIN_HEIGHT_PX,
    Math.min(ANSWER_AREA_MAX_HEIGHT_PX, Math.round(heightPx))
  );
}

export function answerAreaHeightPx(
  answerHeight: AnswerAreaHeight
): number {
  if (answerHeight === "full-page") {
    return FULL_PAGE_ANSWER_HEIGHT_PX;
  }

  return ANSWER_HEIGHT_PX[answerHeight];
}

export function answerAreaHeightPt(
  answerHeight: AnswerAreaHeight
): number {
  if (answerHeight === "full-page") {
    return FULL_PAGE_ANSWER_HEIGHT_PT;
  }

  return ANSWER_HEIGHT_PT[answerHeight];
}

export function resolveAnswerAreaHeightPx(
  item: DocumentAnswerAreaItem
): number {
  return resolveAnswerAreaItemHeightPx(item);
}

export function resolveAnswerAreaHeightPt(
  item: DocumentAnswerAreaItem
): number {
  return pxToAnswerAreaPt(resolveAnswerAreaItemHeightPx(item));
}

export function pxToAnswerAreaPt(heightPx: number): number {
  return clampAnswerAreaHeightPx(heightPx) * PX_TO_PT;
}

export function gridStepPt(_answerArea?: AnswerAreaType | AnswerAreaItemType): number {
  return GRID_STEP_PT;
}

export function gridStepPx(_answerArea?: AnswerAreaType | AnswerAreaItemType): number {
  return GRID_STEP_PX;
}

export function lineStepPt(): number {
  return LINE_STEP_PT;
}

export function lineStepPx(): number {
  return LINE_STEP_PX;
}

export function isGridAnswerArea(
  answerArea: AnswerAreaType | AnswerAreaItemType
): boolean {
  return (
    answerArea === "grid" ||
    answerArea === "grid-5mm" ||
    answerArea === "grid-10mm"
  );
}

export function isLinesAnswerArea(
  answerArea: AnswerAreaType | AnswerAreaItemType
): boolean {
  return answerArea === "lines";
}
