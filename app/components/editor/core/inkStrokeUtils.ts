import type { InkPoint, InkStroke } from "../types";

export const DEFAULT_INK_WIDTH = 400;
export const DEFAULT_INK_HEIGHT = 200;
export const DEFAULT_INK_STROKE_COLOR = "#1e293b";
/** Thin pen tip in CSS pixels (used with vector-effect: non-scaling-stroke). */
export const DEFAULT_INK_STROKE_WIDTH = 1.25;
export const ERASER_HIT_RADIUS = 12;

export const INK_PALETTE = [
  { label: "Czarny", color: "#1e293b" },
  { label: "Niebieski", color: "#2563eb" },
  { label: "Czerwony", color: "#dc2626" },
  { label: "Zielony", color: "#16a34a" },
] as const;

function distanceSquared(a: InkPoint, b: InkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}

function pointToSegmentDistanceSquared(
  point: InkPoint,
  start: InkPoint,
  end: InkPoint
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distanceSquared(point, start);
  }

  let t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return distanceSquared(point, projection);
}

export function findStrokeIndexAtPoint(
  strokes: InkStroke[],
  point: InkPoint,
  hitRadius = ERASER_HIT_RADIUS
): number {
  const hitRadiusSquared = hitRadius * hitRadius;

  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    const points = strokes[index].points;

    if (points.length === 0) {
      continue;
    }

    if (points.length === 1) {
      if (distanceSquared(point, points[0]) <= hitRadiusSquared) {
        return index;
      }

      continue;
    }

    for (let segment = 0; segment < points.length - 1; segment += 1) {
      if (
        pointToSegmentDistanceSquared(
          point,
          points[segment],
          points[segment + 1]
        ) <= hitRadiusSquared
      ) {
        return index;
      }
    }
  }

  return -1;
}

export function pointsToSvgPath(points: InkPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y + 0.01}`;
  }

  const [first, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x} ${point.y}`);

  return `M ${first.x} ${first.y} ${segments.join(" ")}`;
}

export function pointsToPolyline(points: InkPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function scaleInkStrokes(
  strokes: InkStroke[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): InkStroke[] {
  if (fromWidth <= 0 || fromHeight <= 0) {
    return strokes;
  }

  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;

  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }));
}

export function clientPointToInkPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  width: number,
  height: number
): InkPoint {
  const x = ((clientX - rect.left) / rect.width) * width;
  const y = ((clientY - rect.top) / rect.height) * height;

  return {
    x: Math.max(0, Math.min(width, x)),
    y: Math.max(0, Math.min(height, y)),
  };
}

/**
 * Map pointer coordinates through the SVG screen CTM so CSS sizing /
 * preserveAspectRatio letterboxing does not offset the pen from the cursor.
 */
export function clientPointToInkPointFromSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  width: number,
  height: number
): InkPoint {
  const ctm = svg.getScreenCTM();

  if (!ctm) {
    return clientPointToInkPoint(
      clientX,
      clientY,
      svg.getBoundingClientRect(),
      width,
      height
    );
  }

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const local = point.matrixTransform(ctm.inverse());

  return {
    x: Math.max(0, Math.min(width, local.x)),
    y: Math.max(0, Math.min(height, local.y)),
  };
}
