/**
 * Downloads CoMER INT8 models for offline handwriting→math recognition.
 *
 * Source: https://github.com/kimseungdae/ink-on/releases/tag/v0.1.0
 * (Apache-2.0). Place files under public/models/comer/ so recognition
 * works without a network after this one-time download.
 *
 * Usage: node scripts/download-comer-models.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://github.com/kimseungdae/ink-on/releases/download/v0.1.0";
const FILES = ["encoder_int8.onnx", "decoder_int8.onnx", "vocab.json"];
const OUT_DIR = path.join(process.cwd(), "public", "models", "comer");

await mkdir(OUT_DIR, { recursive: true });

for (const file of FILES) {
  const url = `${BASE}/${file}`;
  const target = path.join(OUT_DIR, file);
  process.stdout.write(`Downloading ${file}… `);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log(`${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

console.log(`Done → ${OUT_DIR}`);
