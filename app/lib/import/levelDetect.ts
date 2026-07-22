import type { ExerciseLevel } from "./types";

export type OcrWordBox = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  pageIndex: number;
  lineKey?: string;
};

export type OcrPageResult = {
  pageIndex: number;
  text: string;
  words: OcrWordBox[];
  image: Buffer;
};

export type OcrExtractionResult = {
  text: string;
  pageCount: number;
  pages: OcrPageResult[];
  warnings: string[];
};

function classifyPixel(
  r: number,
  g: number,
  b: number
): "black" | "blue" | "other" {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (saturation < 0.25 && max < 110) {
    return "black";
  }

  if (b > r + 20 && b > g + 10 && b > 80) {
    return "blue";
  }

  return "other";
}

type ImageDataContext = {
  getImageData: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => { data: Uint8ClampedArray };
};

function sampleLevelFromContext(
  context: ImageDataContext,
  bbox: OcrWordBox["bbox"]
): ExerciseLevel | null {
  const x = Math.max(0, Math.floor(bbox.x0));
  const y = Math.max(0, Math.floor(bbox.y0));
  const width = Math.max(1, Math.ceil(bbox.x1 - bbox.x0));
  const height = Math.max(1, Math.ceil(bbox.y1 - bbox.y0));
  const data = context.getImageData(x, y, width, height).data;

  let black = 0;
  let blue = 0;

  for (let index = 0; index < data.length; index += 4) {
    const kind = classifyPixel(data[index], data[index + 1], data[index + 2]);

    if (kind === "black") {
      black += 1;
    } else if (kind === "blue") {
      blue += 1;
    }
  }

  const total = black + blue;

  if (total < 8) {
    return null;
  }

  if (blue > black && blue / total > 0.12) {
    return "extended";
  }

  if (black > blue && black / total > 0.08) {
    return "basic";
  }

  return null;
}

export async function detectLevelFromImageRegion(
  image: Buffer,
  bbox: OcrWordBox["bbox"]
): Promise<ExerciseLevel | null> {
  try {
    const { createCanvas, loadImage } = await import("canvas");
    const loaded = await loadImage(image);
    const canvas = createCanvas(loaded.width, loaded.height);
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(loaded, 0, 0);

    return sampleLevelFromContext(context, bbox);
  } catch (error) {
    console.error("Level color detection failed:", error);
    return null;
  }
}

export function normalizeExerciseNumberToken(value: string): string {
  return value.replace(/\.$/, "").trim();
}

export function findExerciseNumberWord(
  words: OcrWordBox[],
  exerciseNumber: string
): OcrWordBox | null {
  const target = normalizeExerciseNumberToken(exerciseNumber);
  const pazdroWord = findPazdroExerciseNumberWord(words, target);

  if (pazdroWord) {
    return pazdroWord;
  }

  const candidates = words.filter((word) => {
    const token = normalizeExerciseNumberToken(word.text);
    return token === target;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates[candidates.length - 1] ?? null;
}

export function findPazdroExerciseNumberWord(
  words: OcrWordBox[],
  exerciseNumber: string
): OcrWordBox | null {
  const target = normalizeExerciseNumberToken(exerciseNumber);
  const lineBuckets = new Map<string, OcrWordBox[]>();

  for (const word of words) {
    const bucketKey =
      word.lineKey ?? `${word.pageIndex}:${Math.round(word.bbox.y0 / 15)}`;
    const bucket = lineBuckets.get(bucketKey) ?? [];
    bucket.push(word);
    lineBuckets.set(bucketKey, bucket);
  }

  for (const bucket of lineBuckets.values()) {
    const sorted = [...bucket].sort((left, right) => left.bbox.x0 - right.bbox.x0);
    const lineText = sorted.map((word) => word.text).join(" ");
    const match = lineText.match(
      new RegExp(`\\d+\\.\\d+\\.\\s+(${target.replace(".", "\\.")})\\.`, "i")
    );

    if (!match) {
      continue;
    }

    const matches = sorted.filter(
      (item) => normalizeExerciseNumberToken(item.text) === target
    );

    if (matches.length > 0) {
      return matches[matches.length - 1] ?? null;
    }
  }

  return null;
}

export function levelToPoziom(level: ExerciseLevel): number {
  return level === "extended" ? 3 : 1;
}

export function levelToTag(level: ExerciseLevel): string {
  return level;
}

export function buildExerciseTags(level: ExerciseLevel | null): string[] {
  const tags = ["import"];

  if (level) {
    tags.push(levelToTag(level));
  }

  return tags;
}
