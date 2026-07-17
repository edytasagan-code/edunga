import type { InkStroke } from "@/app/components/editor/types";
import type { Stroke } from "ink-on/core";

/** CoMER model assets — prefer local public copy; fall back to release CDN (IndexedDB-cached). */
export const COMER_MODEL_BASE_LOCAL = "/models/comer";
export const COMER_MODEL_BASE_REMOTE =
  "https://github.com/kimseungdae/ink-on/releases/download/v0.1.0";

/** CoMER was trained on thicker CROHME strokes — force a robust tip for recognition. */
const HWR_LINE_WIDTH = 3.5;

export function inkStrokesToHwrStrokes(strokes: InkStroke[]): Stroke[] {
  return strokes.map((stroke) => ({
    points: stroke.points.map((point) => ({ x: point.x, y: point.y })),
    lineWidth: HWR_LINE_WIDTH,
  }));
}

/**
 * Scale a single line's strokes to a comfortable size for CoMER.
 * Small per-line crops often misread digits (e.g. 2y → 4).
 * Wide formulas must not be blown up in X — preprocess caps at 1024px wide.
 */
export function normalizeLineStrokesForRecognition(
  strokes: InkStroke[],
  targetHeight = 72
): Stroke[] {
  if (strokes.length === 0) {
    return [];
  }

  const box = strokesBoundingBox(strokes);
  const height = Math.max(1, box.maxY - box.minY);
  const width = Math.max(1, box.maxX - box.minX);
  const aspect = width / height;

  // Wide intervals / "x ∈ R" — keep native size; CoMER preprocess handles scale.
  if (aspect >= 3.2) {
    return inkStrokesToHwrStrokes(strokes);
  }

  if (height >= targetHeight * 0.85) {
    return inkStrokesToHwrStrokes(strokes);
  }

  const scale = Math.min(2.8, targetHeight / height, 720 / width);
  const padX = 12;
  const padY = 12;

  return strokes.map((stroke) => ({
    points: stroke.points.map((point) => ({
      x: (point.x - box.minX) * scale + padX,
      y: (point.y - box.minY) * scale + padY,
    })),
    lineWidth: HWR_LINE_WIDTH,
  }));
}

/**
 * Split a wide expression at the largest horizontal gap
 * (e.g. interval left, "x ∈ R" right).
 */
export function splitStrokesByLargestXGap(
  strokes: InkStroke[],
  minGap = 28
): InkStroke[][] {
  if (strokes.length < 6) {
    return [strokes];
  }

  const sorted = strokes
    .map((stroke) => {
      const box = strokeBoundingBox(stroke);
      return {
        stroke,
        midX: (box.minX + box.maxX) / 2,
        minX: box.minX,
        maxX: box.maxX,
      };
    })
    .sort((a, b) => a.midX - b.midX);

  let maxGap = 0;
  let splitAt = -1;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].minX - sorted[i].maxX;
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = i;
    }
  }

  if (splitAt < 0 || maxGap < minGap) {
    return [strokes];
  }

  const leftCount = splitAt + 1;
  const rightCount = sorted.length - leftCount;
  if (leftCount < 2 || rightCount < 2) {
    return [strokes];
  }

  return [
    sorted.slice(0, splitAt + 1).map((item) => item.stroke),
    sorted.slice(splitAt + 1).map((item) => item.stroke),
  ];
}

/** Result clearly too short for the amount of ink. */
export function isImplausibleRecognition(
  latex: string,
  strokeCount: number
): boolean {
  const compact = latex.replace(/\s+/g, "");
  if (!compact) {
    return true;
  }
  if (strokeCount >= 8 && compact.length <= 2) {
    return true;
  }
  if (strokeCount >= 12 && compact.length <= 4) {
    return true;
  }
  return false;
}

export function pickStrokesByIndex(
  strokes: InkStroke[],
  indices: number[]
): InkStroke[] {
  const set = new Set(indices);
  return strokes.filter((_, index) => set.has(index));
}

export function removeStrokesByIndex(
  strokes: InkStroke[],
  indices: number[]
): InkStroke[] {
  const set = new Set(indices);
  return strokes.filter((_, index) => !set.has(index));
}

/**
 * Classify leftmost interval opener from ink.
 * Polish school `<` and square `[` both map to `[` in LaTeX; `(` stays `(`.
 */
export function classifyLeftIntervalOpener(
  strokes: InkStroke[]
): "[" | "(" | null {
  if (strokes.length === 0) {
    return null;
  }

  const global = strokesBoundingBox(strokes);
  const gH = Math.max(1, global.maxY - global.minY);
  const gW = Math.max(1, global.maxX - global.minX);

  // Prefer strokes that start on the left edge and span enough height.
  const leftCandidates = strokes
    .map((stroke) => ({ stroke, box: strokeBoundingBox(stroke) }))
    .filter(({ box }) => {
      const height = box.maxY - box.minY;
      const leftBias = (box.minX - global.minX) / gW;
      return leftBias <= 0.35 && height / gH >= 0.28;
    })
    .sort((a, b) => a.box.minX - b.box.minX || a.box.minY - b.box.minY);

  if (leftCandidates.length === 0) {
    return null;
  }

  // `[` as vertical + one/two rightward caps
  const vertical = leftCandidates.find(({ box }) => {
    const width = Math.max(1, box.maxX - box.minX);
    const height = box.maxY - box.minY;
    return height / width >= 2.2 && height / gH >= 0.45;
  });

  if (vertical) {
    const caps = strokes.filter((stroke) => {
      if (stroke === vertical.stroke) {
        return false;
      }
      const box = strokeBoundingBox(stroke);
      const width = box.maxX - box.minX;
      const height = Math.max(1, box.maxY - box.minY);
      if (width < 4 || width / height < 1.15) {
        return false;
      }
      const nearTop = Math.abs(box.minY - vertical.box.minY) <= gH * 0.22;
      const nearBot = Math.abs(box.maxY - vertical.box.maxY) <= gH * 0.22;
      const toRight = box.maxX > vertical.box.maxX + 1;
      const overlapsX = box.minX <= vertical.box.maxX + 12;
      return toRight && overlapsX && (nearTop || nearBot);
    });
    if (caps.length >= 1) {
      return "[";
    }
  }

  // Polish `<` as one polyline with a left tip near mid-height
  const primary = leftCandidates[0];
  const points = primary.stroke.points;
  if (points.length >= 3) {
    let leftIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].x < points[leftIdx].x) {
        leftIdx = i;
      }
    }
    const tip = points[leftIdx];
    const height = Math.max(1, primary.box.maxY - primary.box.minY);
    const width = Math.max(1, primary.box.maxX - primary.box.minX);
    const relY = (tip.y - primary.box.minY) / height;
    const start = points[0];
    const end = points[points.length - 1];
    if (
      relY >= 0.22 &&
      relY <= 0.78 &&
      start.x >= tip.x + 4 &&
      end.x >= tip.x + 4 &&
      Math.abs(start.y - end.y) >= height * 0.32 &&
      // Tip should be near the left of the stroke bbox (chevron, not `C`)
      tip.x <= primary.box.minX + width * 0.2
    ) {
      return "[";
    }
  }

  // Polish `<` as two strokes meeting on the left
  if (leftCandidates.length >= 2) {
    const a = leftCandidates[0].box;
    const b = leftCandidates[1].box;
    const tipX = Math.min(a.minX, b.minX);
    const midAx = (a.minX + a.maxX) / 2;
    const midBx = (b.minX + b.maxX) / 2;
    const midAy = (a.minY + a.maxY) / 2;
    const midBy = (b.minY + b.maxY) / 2;
    if (
      a.minX <= tipX + 10 &&
      b.minX <= tipX + 10 &&
      midAx > tipX + 2 &&
      midBx > tipX + 2 &&
      Math.abs(midAy - midBy) >= gH * 0.18
    ) {
      return "[";
    }
  }

  const width = Math.max(1, primary.box.maxX - primary.box.minX);
  const height = primary.box.maxY - primary.box.minY;
  if (height / width >= 1.3 && height / gH >= 0.35) {
    return "(";
  }

  return null;
}

/**
 * One opener hint per horizontally separated ink group (e.g. two intervals).
 */
export function inferIntervalOpenersFromStrokes(
  strokes: InkStroke[]
): Array<"[" | "(" | null> {
  if (strokes.length === 0) {
    return [];
  }

  const box = strokesBoundingBox(strokes);
  const aspect =
    (box.maxX - box.minX) / Math.max(1, box.maxY - box.minY);
  const parts =
    aspect >= 1.6 && strokes.length >= 4
      ? splitStrokesByLargestXGap(strokes, 18)
      : [strokes];

  return parts.map((part) => classifyLeftIntervalOpener(part));
}

export function strokeBoundingBox(stroke: InkStroke): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of stroke.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

export function strokesBoundingBox(strokes: InkStroke[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    const box = strokeBoundingBox(stroke);
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

export function strokeIntersectsRect(
  stroke: InkStroke,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const box = strokeBoundingBox(stroke);
  if (!Number.isFinite(box.minX)) {
    return false;
  }

  const left = Math.min(rect.x, rect.x + rect.width);
  const right = Math.max(rect.x, rect.x + rect.width);
  const top = Math.min(rect.y, rect.y + rect.height);
  const bottom = Math.max(rect.y, rect.y + rect.height);

  return !(
    box.maxX < left ||
    box.minX > right ||
    box.maxY < top ||
    box.minY > bottom
  );
}

/**
 * Tall, narrow stroke on the left of the ink — typically a system brace `{`.
 * CoMER often misreads these as `\int`, so we strip them and rebuild with cases.
 */
export function findLeftBraceStrokeIndex(strokes: InkStroke[]): number {
  if (strokes.length < 2) {
    return -1;
  }

  // Wide single-line formulas (coords, intervals, ∈ R) must not trigger brace logic.
  if (isLikelySingleLineExpression(strokes)) {
    return -1;
  }

  const global = strokesBoundingBox(strokes);
  const globalHeight = Math.max(1, global.maxY - global.minY);
  const globalWidth = Math.max(1, global.maxX - global.minX);

  let bestIndex = -1;
  let bestScore = 0;

  strokes.forEach((stroke, index) => {
    const box = strokeBoundingBox(stroke);
    const height = box.maxY - box.minY;
    const width = Math.max(1, box.maxX - box.minX);
    const aspect = height / width;
    const leftBias = (box.minX - global.minX) / globalWidth;
    const heightRatio = height / globalHeight;

    // System `{` spans most of the ink height and sits flush left.
    // Reject `(`, `)`, short ticks — they are not multi-row braces.
    if (aspect < 2 || heightRatio < 0.55 || leftBias > 0.2) {
      return;
    }

    const score = aspect * heightRatio * (1 - leftBias);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/**
 * Nearly horizontal stroke — fraction bar or equals sign.
 */
function isHorizontalBarStroke(stroke: InkStroke): boolean {
  const box = strokeBoundingBox(stroke);
  const width = box.maxX - box.minX;
  const height = Math.max(1, box.maxY - box.minY);
  return width >= 12 && width / height >= 2.5 && height <= 14;
}

function strokeMidY(stroke: InkStroke): number {
  const box = strokeBoundingBox(stroke);
  return (box.minY + box.maxY) / 2;
}

/**
 * When a system brace is present but clustering found one blob, split at the
 * largest vertical gap between stroke centers.
 */
export function splitStrokesByLargestYGap(
  strokes: InkStroke[]
): InkStroke[][] {
  if (strokes.length < 4) {
    return [strokes];
  }

  const sorted = [...strokes]
    .map((stroke) => ({ stroke, midY: strokeMidY(stroke) }))
    .sort((a, b) => a.midY - b.midY);

  let maxGap = 0;
  let splitAt = -1;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].midY - sorted[i].midY;
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = i;
    }
  }

  // Need a clear empty band between equation rows.
  if (splitAt < 0 || maxGap < 16) {
    return [strokes];
  }

  return [
    sorted.slice(0, splitAt + 1).map((item) => item.stroke),
    sorted.slice(splitAt + 1).map((item) => item.stroke),
  ];
}

function strokeBaselineY(stroke: InkStroke): number {
  return strokeBoundingBox(stroke).maxY;
}

/**
 * Count hand-drawn `=` strokes (not fraction bars).
 */
export function countEqualsSignStrokes(strokes: InkStroke[]): number {
  let count = 0;

  for (const stroke of strokes) {
    if (!isHorizontalBarStroke(stroke)) {
      continue;
    }
    const box = strokeBoundingBox(stroke);
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    if (width <= 40 && height <= 9) {
      count += 1;
    }
  }

  return count;
}

/**
 * Wide, single-line formulas: coordinates, ∈ R, one fraction, etc.
 * Must not be split into cases.
 */
export function isLikelySingleLineExpression(strokes: InkStroke[]): boolean {
  if (strokes.length === 0) {
    return true;
  }

  const box = strokesBoundingBox(strokes);
  const width = box.maxX - box.minX;
  const height = Math.max(1, box.maxY - box.minY);
  const equalsCount = countEqualsSignStrokes(strokes);

  // Coordinates / intervals / "x ∈ R" — wide, at most one equation `=`.
  if (width / height >= 1.6) {
    return equalsCount < 2;
  }

  return equalsCount === 0;
}

/**
 * Seed row centers from distinct `=` signs only (never fraction bars).
 */
function findEquationRowCenters(strokes: InkStroke[]): number[] {
  const equalsCenters: number[] = [];

  for (const stroke of strokes) {
    if (!isHorizontalBarStroke(stroke)) {
      continue;
    }
    const box = strokeBoundingBox(stroke);
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const baseline = box.maxY;

    if (width <= 40 && height <= 9) {
      equalsCenters.push(baseline);
    }
  }

  if (equalsCenters.length < 2) {
    return [];
  }

  equalsCenters.sort((a, b) => a - b);
  const merged: number[] = [];
  for (const y of equalsCenters) {
    const last = merged[merged.length - 1];
    if (last === undefined || Math.abs(y - last) > 20) {
      merged.push(y);
    }
  }
  return merged;
}

function assignStrokesToRowCenters(
  strokes: InkStroke[],
  rowCenters: number[],
  attachThreshold: number
): InkStroke[][] {
  const rows: InkStroke[][] = rowCenters.map(() => []);

  for (const stroke of strokes) {
    const baseline = strokeBaselineY(stroke);
    let bestIndex = 0;
    let bestDist = Infinity;

    rowCenters.forEach((center, index) => {
      const dist = Math.abs(baseline - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });

    rows[bestIndex].push(stroke);
  }

  return rows
    .filter((row) => row.length > 0)
    .map((row) =>
      [...row].sort(
        (a, b) => strokeBoundingBox(a).minX - strokeBoundingBox(b).minX
      )
    );
}

/**
 * Cluster strokes into horizontal writing lines (excluding optional brace index).
 */
export function clusterStrokesIntoLines(
  strokes: InkStroke[],
  excludeIndices: number[] = [],
  options?: { expectMultipleRows?: boolean }
): InkStroke[][] {
  const excluded = new Set(excludeIndices);
  const indexed = strokes
    .map((stroke, index) => ({ stroke, index, box: strokeBoundingBox(stroke) }))
    .filter((item) => !excluded.has(item.index));

  if (indexed.length === 0) {
    return [];
  }

  const contentStrokes = indexed.map((item) => item.stroke);

  if (isLikelySingleLineExpression(contentStrokes) && !options?.expectMultipleRows) {
    return [
      [...contentStrokes].sort(
        (a, b) => strokeBoundingBox(a).minX - strokeBoundingBox(b).minX
      ),
    ];
  }

  const heights = indexed.map((item) =>
    Math.max(8, item.box.maxY - item.box.minY)
  );
  const medianHeight = [...heights].sort((a, b) => a - b)[
    Math.floor(heights.length / 2)
  ];
  const attachThreshold = Math.max(16, medianHeight * 0.42);
  const globalBox = strokesBoundingBox(contentStrokes);
  const isWide =
    (globalBox.maxX - globalBox.minX) /
      Math.max(1, globalBox.maxY - globalBox.minY) >=
    2;
  const effectiveThreshold = isWide
    ? Math.max(attachThreshold, medianHeight * 0.85)
    : attachThreshold;

  const rowCenters = findEquationRowCenters(contentStrokes);
  if (rowCenters.length >= 2) {
    const seeded = assignStrokesToRowCenters(
      contentStrokes,
      rowCenters,
      attachThreshold
    );
    if (seeded.length >= 2) {
      return seeded;
    }
  }

  const sorted = [...indexed].sort(
    (a, b) => (a.box.minY + a.box.maxY) / 2 - (b.box.minY + b.box.maxY) / 2
  );

  const lines: { strokes: InkStroke[]; centerY: number }[] = [];

  for (const item of sorted) {
    const baseline = item.box.maxY;
    let bestLine: (typeof lines)[number] | null = null;
    let bestDist = Infinity;

    for (const line of lines) {
      const dist = Math.abs(baseline - line.centerY);
      if (dist < bestDist && dist <= effectiveThreshold) {
        bestDist = dist;
        bestLine = line;
      }
    }

    if (!bestLine) {
      lines.push({ strokes: [item.stroke], centerY: baseline });
      continue;
    }

    bestLine.strokes.push(item.stroke);
    bestLine.centerY =
      bestLine.strokes.reduce((sum, stroke) => sum + strokeBaselineY(stroke), 0) /
      bestLine.strokes.length;
  }

  let result = lines
    .map((line) =>
      [...line.strokes].sort(
        (a, b) => strokeBoundingBox(a).minX - strokeBoundingBox(b).minX
      )
    )
    .filter((line) => line.length > 0);

  if (options?.expectMultipleRows && result.length < 2) {
    const split = splitStrokesByLargestYGap(contentStrokes);
    if (split.length >= 2) {
      result = split
        .map((row) =>
          [...row].sort(
            (a, b) => strokeBoundingBox(a).minX - strokeBoundingBox(b).minX
          )
        )
        .filter((row) => row.length > 0);
    }
  }

  return result;
}

/** Normalize CoMER token spacing into compact LaTeX for MathLive. */
export function normalizeRecognizedLatex(latex: string): string {
  return latex
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()\[\],.=+\-*/^_])\s*/g, "$1")
    .replace(/\\([a-zA-Z]+)/g, "\\$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * If CoMER returned an integral with equation-like limits, unwrap to plain lines.
 * Happens when a system brace is misread as `\int`.
 */
export function repairMisreadIntegralAsEquations(latex: string): string | null {
  const cleaned = latex.replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^\\int(?:\\limits)?\s*(?:_\{([^}]*)\})?\s*(?:\^\{([^}]*)\})?\s*(?:\{([^}]*)\}|(.+))?$/
  );

  if (!match) {
    return null;
  }

  const lower = (match[1] ?? "").trim();
  const upper = (match[2] ?? "").trim();
  const body = (match[3] ?? match[4] ?? "").trim();

  const parts = [upper, lower, body].filter((part) => /[=+]/.test(part));
  if (parts.length < 2) {
    return null;
  }

  return `\\begin{cases} ${parts.join(" \\\\ ")} \\end{cases}`;
}

export function assembleLineLatex(
  lineLatex: string[],
  asCases: boolean
): string {
  const lines = lineLatex.map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1 && !asCases) {
    return lines[0];
  }

  // Real systems have `=` on (almost) every row.
  const equationRows = lines.filter((line) => /=/.test(line));
  const shouldUseCases =
    asCases && equationRows.length >= 2 && equationRows.length >= lines.length - 1;

  if (shouldUseCases) {
    return `\\begin{cases} ${lines.join(" \\\\ ")} \\end{cases}`;
  }

  if (lines.length > 1) {
    return lines.join(" ");
  }

  return lines[0];
}

/**
 * Split a horizontal line of strokes into column cells (for matrix detection).
 */
export function clusterStrokesIntoColumns(strokes: InkStroke[]): InkStroke[][] {
  if (strokes.length === 0) {
    return [];
  }

  const indexed = strokes
    .map((stroke) => ({ stroke, box: strokeBoundingBox(stroke) }))
    .sort((a, b) => (a.box.minX + a.box.maxX) / 2 - (b.box.minX + b.box.maxX) / 2);

  const widths = indexed.map((item) =>
    Math.max(6, item.box.maxX - item.box.minX)
  );
  const medianWidth = [...widths].sort((a, b) => a - b)[
    Math.floor(widths.length / 2)
  ];
  const gapThreshold = Math.max(14, medianWidth * 0.75);

  const columns: InkStroke[][] = [];
  let current: InkStroke[] = [];
  let lastMidX = -Infinity;

  for (const item of indexed) {
    const midX = (item.box.minX + item.box.maxX) / 2;
    if (current.length > 0 && midX - lastMidX > gapThreshold) {
      columns.push(current);
      current = [];
    }
    current.push(item.stroke);
    lastMidX = midX;
  }

  if (current.length > 0) {
    columns.push(current);
  }

  return columns;
}

/**
 * Detect a regular row×col grid of ink cells (matrix handwriting).
 */
export function detectMatrixGrid(
  strokes: InkStroke[],
  excludeIndices: number[] = []
): { rows: InkStroke[][][]; cols: number } | null {
  const lines = clusterStrokesIntoLines(strokes, excludeIndices);
  if (lines.length < 2) {
    return null;
  }

  const rowColumns = lines.map((line) => clusterStrokesIntoColumns(line));
  const colCounts = rowColumns.map((cols) => cols.length);
  const maxCols = Math.max(...colCounts);
  const minCols = Math.min(...colCounts);

  if (maxCols < 2 || maxCols > 6 || maxCols !== minCols) {
    return null;
  }

  if (lines.length !== maxCols && !(lines.length === 2 && maxCols === 2)) {
    if (!(lines.length === 3 && maxCols === 3)) {
      return null;
    }
  }

  return { rows: rowColumns, cols: maxCols };
}
