import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { PazdroExerciseBlock } from "./pazdroParser";
import {
  VisionWorkerError,
  formatVisionWorkerFailure,
} from "./visionWorkerError";

const execFileAsync = promisify(execFile);

export type ChildVisionResult = {
  text: string;
  pageCount: number;
  warnings: string[];
  pazdroBlocks: PazdroExerciseBlock[];
};

export async function extractTextWithVisionInChild(
  buffer: Buffer
): Promise<ChildVisionResult> {
  const tempPath = join(tmpdir(), `edunga-import-${randomUUID()}.pdf`);
  writeFileSync(tempPath, buffer);

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        join(process.cwd(), "scripts/vision-import-worker.mjs"),
        tempPath,
      ],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 32,
        timeout: 1000 * 60 * 20,
        env: process.env,
      }
    );

    const trimmedStdout = stdout.trim();

    if (!trimmedStdout) {
      throw new VisionWorkerError({
        message: [
          "Vision worker returned empty stdout.",
          stderr.trim() || "No stderr captured.",
        ].join("\n\n"),
        stdout: trimmedStdout,
        stderr: stderr.trim(),
      });
    }

    try {
      return JSON.parse(trimmedStdout) as ChildVisionResult;
    } catch (parseError) {
      throw new VisionWorkerError({
        message: [
          "Vision worker returned invalid JSON.",
          parseError instanceof Error ? parseError.message : String(parseError),
          trimmedStdout.slice(0, 500),
        ].join("\n\n"),
        stdout: trimmedStdout,
        stderr: stderr.trim(),
      });
    }
  } catch (error) {
    if (error instanceof VisionWorkerError) {
      throw error;
    }

    if (
      error &&
      typeof error === "object" &&
      ("stdout" in error || "stderr" in error || "code" in error)
    ) {
      throw formatVisionWorkerFailure(
        error as {
          message: string;
          stdout?: string;
          stderr?: string;
          code?: number | null;
          signal?: NodeJS.Signals | null;
        }
      );
    }

    throw error;
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
