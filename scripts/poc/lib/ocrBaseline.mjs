/**
 * Standalone PoC — OCR baseline on the same page image (for comparison only).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createWorker } from "tesseract.js";

export async function extractExercisesWithOcr(imagePath) {
  const absolutePath = resolve(imagePath);
  const buffer = readFileSync(absolutePath);
  const startedAt = Date.now();

  const worker = await createWorker("pol+eng");
  await worker.setParameters({ tessedit_pageseg_mode: "6" });

  const result = await worker.recognize(buffer, {}, { blocks: true });
  await worker.terminate();

  const rawText = (result.data.text ?? "").trim();
  const blocks = result.data.blocks ?? [];

  const words = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          if (word.text?.trim()) {
            words.push({
              text: word.text.trim(),
              bbox: word.bbox,
            });
          }
        }
      }
    }
  }

  const exerciseNumbers = [
    ...rawText.matchAll(/\b1\.\d{1,3}[a-z]?\b/gi),
  ].map((match) => match[0]);

  const subtaskLines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[a-d]\)/i.test(line));

  return {
    pipeline: "ocr-tesseract",
    durationMs: Date.now() - startedAt,
    imagePath: absolutePath,
    result: {
      rawText,
      detectedNumbers: [...new Set(exerciseNumbers)],
      subtaskLineCount: subtaskLines.length,
      subtaskLines,
      wordCount: words.length,
      sampleWords: words
        .filter((word) => /[\d.a-d)/]/i.test(word.text))
        .slice(0, 40)
        .map((word) => word.text),
    },
  };
}
