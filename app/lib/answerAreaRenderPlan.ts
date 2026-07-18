import {
  ANSWER_GRID_LINE_COLOR,
  ANSWER_GRID_LINE_COLOR_PDF,
  ANSWER_LINE_COLOR,
  type AnswerAreaItemType,
} from "./documentGenerator";
import {
  gridStepPt,
  gridStepPx,
  isGridAnswerArea,
  lineStepPt,
  lineStepPx,
} from "./answerAreaStyle";

type RenderPlan = {
  isGrid: boolean;
  showGuides: boolean;
  step: number;
  lineColor: string;
  lineThickness: number;
  horizontalCount: number;
  verticalCount: number;
};

export type AnswerAreaGuideGeometry = {
  horizontalOffsets: number[];
  verticalOffsets: number[];
};

export function createPreviewAnswerAreaPlan(
  areaType: AnswerAreaItemType,
  heightPx: number,
  widthPx: number
): RenderPlan {
  const isGrid = isGridAnswerArea(areaType);
  const showGuides = areaType !== "blank";
  const step = isGrid ? gridStepPx(areaType) : lineStepPx();
  const horizontalCount = showGuides ? Math.max(1, Math.floor(heightPx / step)) : 0;
  const verticalCount =
    showGuides && isGrid ? Math.max(1, Math.ceil(widthPx / step)) : 0;

  return {
    isGrid,
    showGuides,
    step,
    lineColor: isGrid ? ANSWER_GRID_LINE_COLOR : ANSWER_LINE_COLOR,
    lineThickness: isGrid ? 0.6 : 1,
    horizontalCount,
    verticalCount,
  };
}

export function createPdfAnswerAreaPlan(
  areaType: AnswerAreaItemType,
  heightPt: number,
  widthPt: number
): RenderPlan {
  const isGrid = isGridAnswerArea(areaType);
  const showGuides = areaType !== "blank";
  const step = isGrid ? gridStepPt(areaType) : lineStepPt();
  const horizontalCount = showGuides ? Math.max(1, Math.floor(heightPt / step)) : 0;
  const verticalCount =
    showGuides && isGrid ? Math.max(1, Math.ceil(widthPt / step)) : 0;

  return {
    isGrid,
    showGuides,
    step,
    lineColor: isGrid ? ANSWER_GRID_LINE_COLOR_PDF : ANSWER_LINE_COLOR,
    lineThickness: isGrid ? 0.4 : 0.4,
    horizontalCount,
    verticalCount,
  };
}

export function createGuideGeometry(
  horizontalCount: number,
  verticalCount: number,
  step: number
): AnswerAreaGuideGeometry {
  return {
    horizontalOffsets: Array.from({ length: horizontalCount }, (_, index) => index * step),
    verticalOffsets: Array.from({ length: verticalCount }, (_, index) => index * step),
  };
}
