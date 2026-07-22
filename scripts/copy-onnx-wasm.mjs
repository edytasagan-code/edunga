/**
 * Copies onnxruntime-web WASM assets into public/ for offline CoMER inference.
 * Run after npm install if public/onnxruntime-web is missing.
 */
import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const SRC = path.join(
  process.cwd(),
  "node_modules",
  "onnxruntime-web",
  "dist"
);
const DEST = path.join(process.cwd(), "public", "onnxruntime-web");

const FILES = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
];

await mkdir(DEST, { recursive: true });

for (const file of FILES) {
  const from = path.join(SRC, file);
  const to = path.join(DEST, file);
  try {
    await access(from);
    await copyFile(from, to);
    console.log(`copied ${file}`);
  } catch {
    console.warn(`skip ${file}`);
  }
}
