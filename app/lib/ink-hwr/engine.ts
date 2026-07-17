"use client";

import * as ort from "onnxruntime-web";
import {
  InferenceEngine,
  isStrokeMeaningful,
  loadVocab,
  preprocessStrokes,
  type RecognitionResult,
  type Vocab,
} from "ink-on/core";

import type { InkStroke } from "@/app/components/editor/types";

import {
  applyStrokeInferredIntervalBrackets,
  enhanceRecognizedLatex,
  looksLikeBrokenMembershipOrInterval,
} from "./latexEnhance";
import {
  COMER_MODEL_BASE_LOCAL,
  COMER_MODEL_BASE_REMOTE,
  assembleLineLatex,
  clusterStrokesIntoLines,
  countEqualsSignStrokes,
  findLeftBraceStrokeIndex,
  inferIntervalOpenersFromStrokes,
  splitStrokesByLargestYGap,
  splitStrokesByLargestXGap,
  inkStrokesToHwrStrokes,
  normalizeLineStrokesForRecognition,
  isLikelySingleLineExpression,
  isImplausibleRecognition,
  normalizeRecognizedLatex,
  repairMisreadIntegralAsEquations,
  strokesBoundingBox,
} from "./strokes";

type EngineBundle = {
  engine: InferenceEngine;
  vocab: Vocab;
};

let bundlePromise: Promise<EngineBundle> | null = null;
let ortConfigured = false;

const ENGINE_INIT_TIMEOUT_MS = 90_000;
const RECOGNIZE_TIMEOUT_MS = 45_000;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function resolveWasmPaths(): Promise<string> {
  try {
    const response = await fetch(
      "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
      { method: "GET", cache: "force-cache" }
    );
    if (response.ok) {
      return "/onnxruntime-web/";
    }
  } catch {
    // fall through
  }

  return "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
}

function configureOrtRuntime(wasmPaths: string) {
  if (ortConfigured || typeof window === "undefined") {
    return;
  }

  // Without COOP/COEP, multi-threaded WASM hangs — force single-thread.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = wasmPaths;

  ortConfigured = true;
}

async function probeLocalModels(): Promise<boolean> {
  try {
    const response = await fetch(`${COMER_MODEL_BASE_LOCAL}/vocab.json`, {
      method: "GET",
      cache: "force-cache",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timer: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}

async function createEngineBundle(): Promise<EngineBundle> {
  const wasmPaths = await resolveWasmPaths();
  configureOrtRuntime(wasmPaths);

  const useLocal = await probeLocalModels();
  const base = useLocal ? COMER_MODEL_BASE_LOCAL : COMER_MODEL_BASE_REMOTE;

  const vocab = await loadVocab(`${base}/vocab.json`);
  const engine = new InferenceEngine({
    encoderUrl: `${base}/encoder_int8.onnx`,
    decoderUrl: `${base}/decoder_int8.onnx`,
    // Greedy decode — ~2× faster than beam on single-thread WASM.
    beamWidth: 1,
    executionProvider: "wasm",
  });

  await withTimeout(
    engine.init(),
    ENGINE_INIT_TIMEOUT_MS,
    "Timeout ładowania modelu CoMER. Odśwież stronę lub uruchom: npm run download:comer-models"
  );

  return { engine, vocab };
}

export async function getMathHwrEngine(): Promise<EngineBundle> {
  if (!bundlePromise) {
    bundlePromise = createEngineBundle().catch((error) => {
      bundlePromise = null;
      throw error;
    });
  }

  return bundlePromise;
}

export type MathHwrResult = {
  latex: string;
  rawLatex: string;
  totalMs: number;
  encoderMs: number;
  decoderMs: number;
  strategy: "single" | "lines" | "cases";
};

async function recognizeStrokeGroup(
  engine: InferenceEngine,
  vocab: Vocab,
  strokes: InkStroke[],
  options?: { normalizeLine?: boolean }
): Promise<RecognitionResult> {
  const hwrStrokes = options?.normalizeLine
    ? normalizeLineStrokesForRecognition(strokes)
    : inkStrokesToHwrStrokes(strokes);

  if (!isStrokeMeaningful(hwrStrokes)) {
    throw new Error("Zbyt mało kresek w linii.");
  }

  const input = preprocessStrokes(hwrStrokes);
  return withTimeout(
    engine.recognize(input, vocab, "expression"),
    RECOGNIZE_TIMEOUT_MS,
    "Timeout rozpoznawania. Spróbuj krótszą formułę lub napisz czytelniej."
  );
}

function finalizeLatex(raw: string, strokes?: InkStroke[]): string {
  const normalized = normalizeRecognizedLatex(raw);
  const repaired = repairMisreadIntegralAsEquations(normalized);
  let latex = enhanceRecognizedLatex(repaired ?? normalized);
  if (strokes && strokes.length > 0) {
    latex = applyStrokeInferredIntervalBrackets(
      latex,
      inferIntervalOpenersFromStrokes(strokes)
    );
  }
  return latex;
}

/**
 * Recognize line groups one-by-one. Parallel ONNX on single-thread WASM
 * only contends for the main thread and makes writing laggy.
 */
async function recognizeGroupsSequential(
  engine: InferenceEngine,
  vocab: Vocab,
  groups: InkStroke[][]
): Promise<{
  latex: string[];
  encoderMs: number;
  decoderMs: number;
  totalMs: number;
}> {
  const latex: string[] = [];
  let encoderMs = 0;
  let decoderMs = 0;
  let totalMs = 0;

  for (let i = 0; i < groups.length; i++) {
    if (i > 0) {
      await yieldToMain();
    }

    try {
      const result = await recognizeStrokeGroup(engine, vocab, groups[i], {
        normalizeLine: true,
      });
      const line = applyStrokeInferredIntervalBrackets(
        enhanceRecognizedLatex(normalizeRecognizedLatex(result.latex)),
        inferIntervalOpenersFromStrokes(groups[i])
      );
      if (line) {
        latex.push(line);
      }
      encoderMs += result.encoderMs;
      decoderMs += result.decoderMs;
      totalMs += result.totalMs;
    } catch {
      // Skip a weak / empty line; keep recognizing the rest.
    }
  }

  return { latex, encoderMs, decoderMs, totalMs };
}

export async function recognizeInkStrokesToLatex(
  strokes: InkStroke[]
): Promise<MathHwrResult> {
  if (strokes.length === 0) {
    throw new Error("Zaznacz pismo do rozpoznania.");
  }

  const { engine, vocab } = await getMathHwrEngine();

  const braceIndex = findLeftBraceStrokeIndex(strokes);
  const singleLine = isLikelySingleLineExpression(strokes);
  const effectiveBraceIndex = singleLine ? -1 : braceIndex;
  const exclude = effectiveBraceIndex >= 0 ? [effectiveBraceIndex] : [];
  const contentStrokes =
    effectiveBraceIndex >= 0
      ? strokes.filter((_, index) => index !== effectiveBraceIndex)
      : strokes;
  const equalsCount = countEqualsSignStrokes(contentStrokes);

  const lines = clusterStrokesIntoLines(strokes, exclude, {
    expectMultipleRows: effectiveBraceIndex >= 0,
  });

  // cases only for real system brace OR 2+ rows each with their own `=`
  const useLineStrategy =
    !singleLine &&
    (effectiveBraceIndex >= 0 || (lines.length >= 2 && equalsCount >= 2));

  if (useLineStrategy) {
    const { latex: lineLatex, encoderMs, decoderMs, totalMs } =
      await recognizeGroupsSequential(engine, vocab, lines);

    if (lineLatex.length === 0) {
      const contentStrokes =
        effectiveBraceIndex >= 0
          ? strokes.filter((_, index) => index !== effectiveBraceIndex)
          : strokes;
      const result = await recognizeStrokeGroup(
        engine,
        vocab,
        contentStrokes.length > 0 ? contentStrokes : strokes
      );
      const rawLatex = result.latex.trim();
      if (!rawLatex) {
        throw new Error(
          "Nie udało się rozpoznać formuły. Spróbuj napisać czytelniej."
        );
      }

      const latex = finalizeLatex(rawLatex, contentStrokes.length > 0 ? contentStrokes : strokes);
      return {
        latex,
        rawLatex,
        totalMs: result.totalMs,
        encoderMs: result.encoderMs,
        decoderMs: result.decoderMs,
        strategy: latex.includes("\\begin{cases}") ? "cases" : "single",
      };
    }

    // With a system brace we always want cases, even if only one line decoded.
    const asCases = effectiveBraceIndex >= 0 || lineLatex.length > 1;
    const latex = assembleLineLatex(lineLatex, asCases);

    if (effectiveBraceIndex >= 0 && lineLatex.length < 2 && lines.length < 2) {
      const contentStrokes = strokes.filter(
        (_, index) => index !== effectiveBraceIndex
      );
      const forced = splitStrokesByLargestYGap(contentStrokes);
      if (forced.length >= 2) {
        const retry = await recognizeGroupsSequential(engine, vocab, forced);
        if (retry.latex.length >= 2) {
          return {
            latex: assembleLineLatex(retry.latex, true),
            rawLatex: retry.latex.join(" \\\\ "),
            totalMs: totalMs + retry.totalMs,
            encoderMs: encoderMs + retry.encoderMs,
            decoderMs: decoderMs + retry.decoderMs,
            strategy: "cases",
          };
        }
      }
    }

    return {
      latex,
      rawLatex: lineLatex.join(" \\\\ "),
      totalMs,
      encoderMs,
      decoderMs,
      strategy: asCases ? "cases" : "lines",
    };
  }

  const result = await recognizeStrokeGroup(engine, vocab, strokes, {
    normalizeLine: true,
  });
  const rawLatex = result.latex.trim();
  const totalMs = result.totalMs;
  const encoderMs = result.encoderMs;
  const decoderMs = result.decoderMs;

  if (!rawLatex) {
    throw new Error(
      "Nie udało się rozpoznać formuły. Spróbuj napisać czytelniej."
    );
  }

  // Post-process first — often enough for ∈ / () without a second ONNX pass.
  let latex = finalizeLatex(rawLatex, strokes);

  const stillBroken =
    isImplausibleRecognition(latex, strokes.length) ||
    looksLikeBrokenMembershipOrInterval(latex);

  // At most one extra pass: split wide ink and recognize parts sequentially.
  if (stillBroken) {
    const box = strokesBoundingBox(strokes);
    const aspect =
      (box.maxX - box.minX) / Math.max(1, box.maxY - box.minY);
    if (aspect >= 2.0 && strokes.length >= 6) {
      const parts = splitStrokesByLargestXGap(strokes, 22);
      if (parts.length >= 2) {
        await yieldToMain();
        const split = await recognizeGroupsSequential(engine, vocab, parts);
        const joined = split.latex.join(",\\; ").trim();
        if (joined) {
          const finalized = finalizeLatex(joined, strokes);
          if (
            !looksLikeBrokenMembershipOrInterval(finalized) ||
            finalized.replace(/\s+/g, "").length >
              latex.replace(/\s+/g, "").length
          ) {
            return {
              latex: finalized,
              rawLatex: joined,
              totalMs: totalMs + split.totalMs,
              encoderMs: encoderMs + split.encoderMs,
              decoderMs: decoderMs + split.decoderMs,
              strategy: "lines",
            };
          }
        }
      }
    }
  }

  return {
    latex,
    rawLatex,
    totalMs,
    encoderMs,
    decoderMs,
    strategy: latex.includes("\\begin{cases}") ? "cases" : "single",
  };
}
