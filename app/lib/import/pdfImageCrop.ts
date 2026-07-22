import sharp from "sharp";

import type { VisionFigure } from "./visionExtract";

export type CroppedFigure = {
  src: string;
  width: number;
  height: number;
};

export type FigureCropOptions = {
  /**
   * When true, trim Vision bbox to diagram/figure ink and drop surrounding
   * printed text bands. Used when exercise text was already extracted by Vision.
   */
  illustrationOnly?: boolean;
};

/** Minimum pixels removed on any edge before applying ink-bound trim. */
const MIN_ILLUSTRATION_TRIM_PX = 6;

/** Greyscale value below which a pixel counts as ink (diagram, not paper). */
const INK_THRESHOLD = 235;

/** Padding around detected illustration ink bounds. */
const INK_PADDING_PX = 4;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function bboxToPixels(
  bbox: VisionFigure["bbox"],
  pageWidth: number,
  pageHeight: number
): { left: number; top: number; width: number; height: number } | null {
  const x = clampPercent(bbox.x);
  const y = clampPercent(bbox.y);
  const widthPct = clampPercent(bbox.width);
  const heightPct = clampPercent(bbox.height);

  if (widthPct <= 0 || heightPct <= 0) {
    return null;
  }

  const left = Math.round((x / 100) * pageWidth);
  const top = Math.round((y / 100) * pageHeight);
  const width = Math.round((widthPct / 100) * pageWidth);
  const height = Math.round((heightPct / 100) * pageHeight);

  const safeLeft = Math.min(left, Math.max(0, pageWidth - 1));
  const safeTop = Math.min(top, Math.max(0, pageHeight - 1));
  const safeWidth = Math.min(width, pageWidth - safeLeft);
  const safeHeight = Math.min(height, pageHeight - safeTop);

  if (safeWidth <= 0 || safeHeight <= 0) {
    return null;
  }

  return {
    left: safeLeft,
    top: safeTop,
    width: safeWidth,
    height: safeHeight,
  };
}

function findInkBounds(
  pixels: Uint8Array,
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[y * width + x] < INK_THRESHOLD) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const left = Math.max(0, minX - INK_PADDING_PX);
  const top = Math.max(0, minY - INK_PADDING_PX);
  const right = Math.min(width - 1, maxX + INK_PADDING_PX);
  const bottom = Math.min(height - 1, maxY + INK_PADDING_PX);

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function isLikelyPrintedTextRow(
  pixels: Uint8Array,
  width: number,
  y: number
): boolean {
  let darkCount = 0;
  let segments = 0;
  let inSegment = false;

  for (let x = 0; x < width; x += 1) {
    const dark = pixels[y * width + x] < INK_THRESHOLD;

    if (dark) {
      darkCount += 1;

      if (!inSegment) {
        segments += 1;
        inSegment = true;
      }
    } else {
      inSegment = false;
    }
  }

  if (darkCount === 0) {
    return false;
  }

  const coverage = darkCount / width;

  return coverage > 0.06 && coverage < 0.7 && segments >= 6;
}

function trimPrintedTextBands(
  pixels: Uint8Array,
  width: number,
  height: number
): { top: number; height: number } {
  let top = 0;
  let bottom = height - 1;

  while (top < height && isLikelyPrintedTextRow(pixels, width, top)) {
    top += 1;
  }

  while (bottom > top && isLikelyPrintedTextRow(pixels, width, bottom)) {
    bottom -= 1;
  }

  return {
    top,
    height: Math.max(1, bottom - top + 1),
  };
}

function shouldApplyIllustrationTrim(
  original: { width: number; height: number },
  trimmed: { left: number; top: number; width: number; height: number }
): boolean {
  const trimmedLeft = trimmed.left >= MIN_ILLUSTRATION_TRIM_PX;
  const trimmedTop = trimmed.top >= MIN_ILLUSTRATION_TRIM_PX;
  const trimmedRight =
    original.width - trimmed.left - trimmed.width >= MIN_ILLUSTRATION_TRIM_PX;
  const trimmedBottom =
    original.height - trimmed.top - trimmed.height >= MIN_ILLUSTRATION_TRIM_PX;

  return trimmedLeft || trimmedTop || trimmedRight || trimmedBottom;
}

export async function trimCropToIllustrationInk(
  cropBuffer: Buffer
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(cropBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const textBandTrim = trimPrintedTextBands(data, info.width, info.height);

  let workingBuffer = cropBuffer;
  let workingWidth = info.width;
  let workingHeight = info.height;

  if (textBandTrim.top > 0 || textBandTrim.height < info.height) {
    workingBuffer = await sharp(cropBuffer)
      .extract({
        left: 0,
        top: textBandTrim.top,
        width: info.width,
        height: textBandTrim.height,
      })
      .png()
      .toBuffer();
    workingWidth = info.width;
    workingHeight = textBandTrim.height;
  }

  const { data: inkData, info: inkInfo } = await sharp(workingBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const inkBounds = findInkBounds(inkData, inkInfo.width, inkInfo.height);

  if (
    !inkBounds ||
    !shouldApplyIllustrationTrim(
      { width: inkInfo.width, height: inkInfo.height },
      inkBounds
    )
  ) {
    const meta = await sharp(workingBuffer).metadata();

    return {
      buffer: workingBuffer,
      width: meta.width ?? workingWidth,
      height: meta.height ?? workingHeight,
    };
  }

  const trimmedBuffer = await sharp(workingBuffer)
    .extract(inkBounds)
    .png()
    .toBuffer();

  return {
    buffer: trimmedBuffer,
    width: inkBounds.width,
    height: inkBounds.height,
  };
}

export async function cropFigureFromPage(
  pageBuffer: Buffer,
  bbox: VisionFigure["bbox"],
  options?: FigureCropOptions
): Promise<CroppedFigure | null> {
  const meta = await sharp(pageBuffer).metadata();
  const pageWidth = meta.width ?? 0;
  const pageHeight = meta.height ?? 0;

  if (pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const region = bboxToPixels(bbox, pageWidth, pageHeight);

  if (!region) {
    return null;
  }

  const cropped = await sharp(pageBuffer)
    .extract(region)
    .png()
    .toBuffer();

  const illustrationOnly = options?.illustrationOnly ?? false;

  if (!illustrationOnly) {
    return {
      src: `data:image/png;base64,${cropped.toString("base64")}`,
      width: region.width,
      height: region.height,
    };
  }

  const trimmed = await trimCropToIllustrationInk(cropped);

  return {
    src: `data:image/png;base64,${trimmed.buffer.toString("base64")}`,
    width: trimmed.width,
    height: trimmed.height,
  };
}
