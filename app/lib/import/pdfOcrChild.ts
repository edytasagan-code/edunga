import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { PazdroExerciseBlock } from "./pazdroParser";

const execFileAsync = promisify(execFile);

export type ChildOcrResult = {
  text: string;
  pageCount: number;
  warnings: string[];
  pazdroBlocks: PazdroExerciseBlock[];
};

export async function extractTextWithOcrInChild(
  buffer: Buffer
): Promise<ChildOcrResult> {
  const tempPath = join(tmpdir(), `edunga-import-${randomUUID()}.pdf`);
  writeFileSync(tempPath, buffer);

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        join(process.cwd(), "scripts/ocr-import-worker.mjs"),
        tempPath,
      ],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 32,
        env: process.env,
      }
    );

    return JSON.parse(stdout) as ChildOcrResult;
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
